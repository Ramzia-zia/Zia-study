import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./Planning.css";

function Planning() {
  const [planning, setPlanning] = useState([]);
  const [cours, setCours] = useState("");
  const [jour, setJour] = useState("");
  const [heure, setHeure] = useState("");

  const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  useEffect(() => {
    chargerPlanning();
  }, []);

  const chargerPlanning = async () => {
    try {
      const res = await axios.get("http://192.168.1.87:5000/api/planning");
      setPlanning(res.data);
    } catch (error) {
      toast.error("Erreur lors du chargement du planning.");
    }
  };

  const ajouterCours = async () => {
    if (!cours.trim() || !jour || !heure) {
      toast.warning("Veuillez remplir tous les champs.");
      return;
    }
    try {
      await axios.post("http://192.168.1.87:5000/api/planning", { cours, jour, heure });
      toast.success("Cours ajouté avec succès.");
      setCours("");
      setJour("");
      setHeure("");
      chargerPlanning();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du cours.");
    }
  };

  const supprimerCours = async (id) => {
    try {
      await axios.delete(`http://192.168.1.87:5000/api/planning/${id}`);
      toast.success("Cours supprimé.");
      chargerPlanning();
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="planning-container">
      <h2>Planning d'etude</h2>

      <div className="planning-form">
        <input
          type="text"
          placeholder="Nom du cours"
          value={cours}
          onChange={(e) => setCours(e.target.value)}
        />
        <select value={jour} onChange={(e) => setJour(e.target.value)}>
          <option value="">Choisir un jour</option>
          {jours.map((j) => (
            <option key={j} value={j}>{j}</option>
          ))}
        </select>
        <input
          type="time"
          value={heure}
          onChange={(e) => setHeure(e.target.value)}
        />
        <button onClick={ajouterCours}>Ajouter</button>
      </div>

      <div className="planning-liste">
        {planning.length === 0 && <p className="vide">Aucun cours dans le planning.</p>}
        {planning.map((item) => (
          <div key={item.id} className="planning-item">
            <div className="planning-info">
              <span className="planning-cours">{item.cours}</span>
              <span className="planning-details">{item.jour} a {item.heure}</span>
            </div>
            <button className="supprimer" onClick={() => supprimerCours(item.id)}>Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Planning;