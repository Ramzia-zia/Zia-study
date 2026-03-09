import React, { useState } from "react";
import axios from "axios";
import "./Resume.css";

function Resume() {
  const [texte, setTexte] = useState("");
  const [fichier, setFichier] = useState(null);
  const [resume, setResume] = useState("");
  const [loading, setLoading] = useState(false);

  const genererResume = async () => {
    setLoading(true);
    setResume("");

    try {
      if (fichier) {
        const formData = new FormData();
formData.append("fichier", fichier);
const res = await axios.post("https://zia-study-production.up.railway.app/resume", formData, {
  headers: { "Content-Type": "multipart/form-data" }
});
        setResume(res.data.resume);
      } else if (texte.trim()) {
       const res = await axios.post("https://zia-study-production.up.railway.app/resume", { texte });
        setResume(res.data.resume);
      } else {
        setResume("Veuillez entrer un texte ou importer un fichier.");
      }
    } catch (error) {
      setResume("Erreur de connexion au serveur.");
    }

    setLoading(false);
  };

  return (
    <div className="resume-container">
      <h2>Generateur de Resume</h2>

      <textarea
        placeholder="Colle ton texte de cours ici..."
        value={texte}
        onChange={(e) => setTexte(e.target.value)}
        rows={6}
      />

      <div className="resume-fichier">
        <label>Importer un fichier (PDF, Word, Image) :</label>
        <input
          type="file"
          accept=".pdf,.docx,.png,.jpg,.jpeg"
          onChange={(e) => setFichier(e.target.files[0])}
        />
      </div>

      <button onClick={genererResume} disabled={loading}>
        {loading ? "Generation en cours..." : "Generer le Resume"}
      </button>

      {resume && (
        <div className="resume-resultat">
          <h3>Resume genere :</h3>
          <p>{resume}</p>
        </div>
      )}
    </div>
  );
}

export default Resume;