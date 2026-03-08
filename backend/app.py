from flask import Flask, request, jsonify # type: ignore
from flask_cors import CORS # type: ignore
import pymysql # type: ignore
import os
import requests # type: ignore
from dotenv import load_dotenv # type: ignore
import pdfplumber # type: ignore
from docx import Document as DocxDocument # type: ignore
from pywebpush import webpush, WebPushException # type: ignore
from apscheduler.schedulers.background import BackgroundScheduler # type: ignore
from datetime import datetime
import json
import base64
from cryptography.hazmat.primitives.serialization import Encoding, PrivateFormat, NoEncryption # type: ignore
from cryptography.hazmat.primitives.serialization import load_pem_private_key # type: ignore

load_dotenv()

app = Flask(__name__)
CORS(app)

UPLOAD_FOLDER = 'uploads'
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

HF_API_KEY = os.getenv("HF_API_KEY")
MYSQL_HOST = os.getenv("MYSQL_HOST")
MYSQL_USER = os.getenv("MYSQL_USER")
MYSQL_PASSWORD = os.getenv("MYSQL_PASSWORD")
MYSQL_DB = os.getenv("MYSQL_DB")
VAPID_PUBLIC_KEY = os.getenv("VAPID_PUBLIC_KEY")
VAPID_PRIVATE_KEY = os.getenv("VAPID_PRIVATE_KEY")
VAPID_CLAIMS_EMAIL = os.getenv("VAPID_CLAIMS_EMAIL")

# Stocker les abonnements push en mémoire
subscriptions = []

def get_db():
    return pymysql.connect(
        host=MYSQL_HOST,
        port=int(os.getenv("MYSQL_PORT", 3306)),
        user=MYSQL_USER,
        password=MYSQL_PASSWORD,
        database=MYSQL_DB,
        cursorclass=pymysql.cursors.DictCursor
    )
# ========== CHAT ==========
@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    message = data.get('message', '')
    historique = data.get('historique', [])

    messages = historique + [{"role": "user", "content": message}]

    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "meta-llama/llama-3.1-8b-instruct",
        "messages": messages,
        "max_tokens": 1000
    }

    response = requests.post(
        "https://router.huggingface.co/novita/v3/openai/chat/completions",
        headers=headers,
        json=payload
    )

    result = response.json()
    reply = result['choices'][0]['message']['content']
    return jsonify({"reply": reply})

# ========== RESUME ==========
@app.route('/resume', methods=['POST'])
def resume():
    texte = ""
    if 'fichier' in request.files:
        fichier = request.files['fichier']
        nom = fichier.filename
        chemin = os.path.join(UPLOAD_FOLDER, nom)
        fichier.save(chemin)

        if nom.endswith('.pdf'):
            with pdfplumber.open(chemin) as pdf:
                for page in pdf.pages:
                    texte += page.extract_text() or ""
        elif nom.endswith('.docx'):
            doc = DocxDocument(chemin)
            for para in doc.paragraphs:
                texte += para.text + "\n"
    else:
        texte = request.json.get('texte', '')

    headers = {
        "Authorization": f"Bearer {HF_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "meta-llama/llama-3.1-8b-instruct",
        "messages": [{"role": "user", "content": f"Fais un résumé clair et structuré en français de ce texte:\n\n{texte}"}],
        "max_tokens": 1000
    }

    response = requests.post(
        "https://router.huggingface.co/novita/v3/openai/chat/completions",
        headers=headers,
        json=payload
    )

    result = response.json()
    resume_text = result['choices'][0]['message']['content']
    return jsonify({"resume": resume_text})

# ========== PLANNING ==========
@app.route('/planning', methods=['GET'])
def get_planning():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM planning")
    rows = cursor.fetchall()
    db.close()
    return jsonify(rows)

@app.route('/planning', methods=['POST'])
def add_planning():
    data = request.json
    db = get_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO planning (cours, jour, heure) VALUES (%s, %s, %s)",
                   (data['cours'], data['jour'], data['heure']))
    db.commit()
    db.close()
    return jsonify({"message": "Ajouté"})

@app.route('/planning/<int:id>', methods=['DELETE'])
def delete_planning(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM planning WHERE id = %s", (id,))
    db.commit()
    db.close()
    return jsonify({"message": "Supprimé"})

# ========== RAPPELS ==========
@app.route('/rappels', methods=['GET'])
def get_rappels():
    db = get_db()
    cursor = db.cursor()
    cursor.execute("SELECT * FROM rappels")
    rows = cursor.fetchall()
    db.close()
    return jsonify(rows)

@app.route('/rappels', methods=['POST'])
def add_rappel():
    data = request.json
    db = get_db()
    cursor = db.cursor()
    cursor.execute("INSERT INTO rappels (message, heure, jour) VALUES (%s, %s, %s)",
                   (data['message'], data['heure'], data['jour']))
    db.commit()
    db.close()
    return jsonify({"message": "Rappel ajouté"})

@app.route('/rappels/<int:id>', methods=['DELETE'])
def delete_rappel(id):
    db = get_db()
    cursor = db.cursor()
    cursor.execute("DELETE FROM rappels WHERE id = %s", (id,))
    db.commit()
    db.close()
    return jsonify({"message": "Supprimé"})

# ========== NOTIFICATIONS PUSH ==========
@app.route('/subscribe', methods=['POST'])
def subscribe():
    subscription = request.json
    if subscription not in subscriptions:
        subscriptions.append(subscription)
    return jsonify({"message": "Abonné"})

@app.route('/vapid-public-key', methods=['GET'])
def get_vapid_public_key():
    return jsonify({"publicKey": VAPID_PUBLIC_KEY})

def envoyer_notifications():
    maintenant = datetime.now()
    heure_actuelle = maintenant.strftime("%H:%M")
    jours_fr = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"]
    jour_actuel = jours_fr[maintenant.weekday()]

    try:
        db = get_db()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM rappels WHERE heure = %s AND jour = %s",
                       (heure_actuelle, jour_actuel))
        rappels = cursor.fetchall()
        db.close()

        for rappel in rappels:
            for sub in subscriptions:
                try:
                    private_key_bytes = base64.b64decode(VAPID_PRIVATE_KEY)
                    private_key = load_pem_private_key(private_key_bytes, password=None)
                    private_key_der = private_key.private_bytes(
                        Encoding.DER, PrivateFormat.TraditionalOpenSSL, NoEncryption()
                    )

                    webpush(
                        subscription_info=sub,
                        data=json.dumps({
                            "title": "⏰ Rappel Zia Study",
                            "body": rappel['message']
                        }),
                        vapid_private_key=private_key_der,
                        vapid_claims={"sub": VAPID_CLAIMS_EMAIL}
                    )
                except WebPushException as e:
                    print(f"Erreur push: {e}")
    except Exception as e:
        print(f"Erreur scheduler: {e}")

# Lancer le scheduler
scheduler = BackgroundScheduler()
scheduler.add_job(envoyer_notifications, 'interval', minutes=1)
scheduler.start()

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)