import React, { useState, useEffect } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import "./Rappels.css";

function Rappels() {
  const [rappels, setRappels] = useState([]);
  const [message, setMessage] = useState("");
  const [heure, setHeure] = useState("");
  const [jour, setJour] = useState("");

  const jours = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];

  useEffect(() => {
    chargerRappels();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const maintenant = new Date();
      const heureActuelle = maintenant.getHours().toString().padStart(2, "0") + ":" + maintenant.getMinutes().toString().padStart(2, "0");
      const joursNoms = ["Dimanche", "Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi"];
      const jourActuel = joursNoms[maintenant.getDay()];
      rappels.forEach((rappel) => {
        if (rappel.heure === heureActuelle && rappel.jour === jourActuel) {
          toast.info("Rappel : " + rappel.message, { toastId: rappel.id });
        }
      });
    }, 60000);
    return () => clearInterval(interval);
  }, [rappels]);

  const chargerRappels = async () => {
    try {
      const res = await axios.get("http://127.0.0.1:5000/api/rappels");
      setRappels(res.data);
    } catch (error) {
      toast.error("Erreur lors du chargement des rappels.");
    }
  };

  const ajouterRappel = async () => {
    if (!message.trim() || !heure || !jour) {
      toast.warning("Veuillez remplir tous les champs.");
      return;
    }
    try {
      await axios.post("http://127.0.0.1:5000/api/rappels", { message, heure, jour });
      toast.success("Rappel ajouté avec succès.");
      setMessage("");
      setHeure("");
      setJour("");
      chargerRappels();
    } catch (error) {
      toast.error("Erreur lors de l'ajout du rappel.");
    }
  };

  const supprimerRappel = async (id) => {
    try {
      await axios.delete(`http://127.0.0.1:5000/api/rappels/${id}`);
      toast.success("Rappel supprimé.");
      chargerRappels();
    } catch (error) {
      toast.error("Erreur lors de la suppression.");
    }
  };

  return (
    <div className="rappels-container">
      <h2>Rappels d'etude</h2>

      <div className="rappels-form">
        <input
          type="text"
          placeholder="Message du rappel"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
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
        <button onClick={ajouterRappel}>Ajouter</button>
      </div>

      <div className="rappels-liste">
        {rappels.length === 0 && <p className="vide">Aucun rappel enregistré.</p>}
        {rappels.map((item) => (
          <div key={item.id} className="rappel-item">
            <div className="rappel-info">
              <span className="rappel-message">{item.message}</span>
              <span className="rappel-heure">{item.jour} a {item.heure}</span>
            </div>
            <button className="supprimer" onClick={() => supprimerRappel(item.id)}>Supprimer</button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Rappels;