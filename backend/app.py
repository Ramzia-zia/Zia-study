from flask import Flask, request, jsonify
from flask_cors import CORS
import pymysql
import os
import requests
import pdfplumber
from docx import Document
from PIL import Image
import io
import base64
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

HF_API_KEY = os.getenv("HF_API_KEY")
HF_API_URL = "https://router.huggingface.co/novita/v3/openai/chat/completions"
HEADERS = {"Authorization": f"Bearer {HF_API_KEY}"}

def query_huggingface(prompt):
    payload = {
        "model": "meta-llama/llama-3.1-8b-instruct",
        "messages": [
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 1024
    }
    response = requests.post(HF_API_URL, headers=HEADERS, json=payload)
    print("STATUS:", response.status_code)
    print("RESPONSE:", response.text)
    if response.status_code != 200:
        return f"Erreur {response.status_code}: {response.text}"
    result = response.json()
    if "choices" in result:
        return result["choices"][0]["message"]["content"]
    elif "error" in result:
        return f"Erreur: {result['error']}"
    return "Pas de réponse disponible."

def get_db():
    return pymysql.connect(
        host=os.getenv("MYSQL_HOST"),
        user=os.getenv("MYSQL_USER"),
        password=os.getenv("MYSQL_PASSWORD"),
        database=os.getenv("MYSQL_DB"),
        cursorclass=pymysql.cursors.DictCursor
    )

# CHAT
@app.route("/api/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message", "")
    prompt = f"Tu es un assistant d'étude intelligent. Réponds en français à cette question : {message}"
    reponse = query_huggingface(prompt)
    return jsonify({"response": reponse})

# RESUME
@app.route("/api/resume", methods=["POST"])
def resume():
    texte = ""

    if "file" in request.files:
        fichier = request.files["file"]
        nom = fichier.filename
        contenu = fichier.read()

        if nom.endswith(".pdf"):
            with pdfplumber.open(io.BytesIO(contenu)) as pdf:
                for page in pdf.pages:
                    texte += page.extract_text() or ""

        elif nom.endswith(".docx"):
            doc = Document(io.BytesIO(contenu))
            for para in doc.paragraphs:
                texte += para.text + "\n"

        elif nom.endswith((".png", ".jpg", ".jpeg")):
            return jsonify({"error": "Les images ne sont pas supportées pour le moment."}), 400

    elif request.is_json:
        texte = request.get_json().get("texte", "")

    if not texte:
        return jsonify({"error": "Aucun contenu fourni"}), 400

    prompt = f"Génère un résumé structuré en français du texte suivant avec les points clés, définitions importantes et exemples :\n\n{texte[:3000]}"
    reponse = query_huggingface(prompt)
    return jsonify({"resume": reponse})

# PLANNING
@app.route("/api/planning", methods=["GET"])
def get_planning():
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT * FROM planning")
        result = cursor.fetchall()
    db.close()
    return jsonify(result)

@app.route("/api/planning", methods=["POST"])
def add_planning():
    data = request.get_json()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("INSERT INTO planning (cours, jour, heure) VALUES (%s, %s, %s)",
                       (data["cours"], data["jour"], data["heure"]))
        db.commit()
    db.close()
    return jsonify({"message": "Cours ajouté"})

@app.route("/api/planning/<int:id>", methods=["DELETE"])
def delete_planning(id):
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM planning WHERE id = %s", (id,))
        db.commit()
    db.close()
    return jsonify({"message": "Cours supprimé"})

# RAPPELS
@app.route("/api/rappels", methods=["GET"])
def get_rappels():
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("SELECT * FROM rappels")
        result = cursor.fetchall()
    db.close()
    return jsonify(result)

@app.route("/api/rappels", methods=["POST"])
def add_rappel():
    data = request.get_json()
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("INSERT INTO rappels (message, heure, jour) VALUES (%s, %s, %s)",
                       (data["message"], data["heure"], data.get("jour", "")))
        db.commit()
    db.close()
    return jsonify({"message": "Rappel ajouté"})

@app.route("/api/rappels/<int:id>", methods=["DELETE"])
def delete_rappel(id):
    db = get_db()
    with db.cursor() as cursor:
        cursor.execute("DELETE FROM rappels WHERE id = %s", (id,))
        db.commit()
    db.close()
    return jsonify({"message": "Rappel supprimé"})

if __name__ == "__main__":
    app.run(debug=True, host="0.0.0.0", port=5000)