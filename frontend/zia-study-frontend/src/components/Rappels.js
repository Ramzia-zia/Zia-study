import React, { useState, useEffect } from 'react';
import axios from 'axios';
import toast, { Toaster } from 'react-hot-toast';
import './Rappels.css';

const API = 'http://10.0.0.80:5000';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

async function abonnerNotifications() {
  try {
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
      toast.warn('Les notifications push ne sont pas supportées par ce navigateur');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
      toast.warn('Permission de notification refusée');
      return;
    }

    const registration = await navigator.serviceWorker.ready;
    const response = await axios.get(`${API}/vapid-public-key`);
    const publicKey = response.data.publicKey;
    const convertedKey = urlBase64ToUint8Array(publicKey);

    const subscription = await registration.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: convertedKey
    });

    await axios.post(`${API}/subscribe`, subscription);
    toast.success('Notifications activées !');
  } catch (error) {
    console.error('Erreur abonnement:', error);
    toast.error('Erreur lors de l\'activation des notifications');
  }
}

function Rappels() {
  const [rappels, setRappels] = useState([]);
  const [message, setMessage] = useState('');
  const [heure, setHeure] = useState('');
  const [jour, setJour] = useState('Lundi');

  const jours = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'];

  useEffect(() => {
    chargerRappels();
    abonnerNotifications();
  }, []);

  const chargerRappels = async () => {
    try {
      const res = await axios.get(`${API}/rappels`);
      setRappels(res.data);
    } catch (error) {
      toast.error('Erreur chargement rappels');
    }
  };

  const ajouterRappel = async () => {
    if (!message || !heure || !jour) {
      toast.warn('Remplis tous les champs');
      return;
    }
    try {
      await axios.post(`${API}/rappels`, { message, heure, jour });
      setMessage('');
      setHeure('');
      setJour('Lundi');
      chargerRappels();
      toast.success('Rappel ajouté !');
    } catch (error) {
      toast.error('Erreur ajout rappel');
    }
  };

  const supprimerRappel = async (id) => {
    try {
      await axios.delete(`${API}/rappels/${id}`);
      chargerRappels();
      toast.success('Rappel supprimé');
    } catch (error) {
      toast.error('Erreur suppression');
    }
  };

  return (
    <div className="rappels-container">
      <Toaster position="top-right" />
      <h2>⏰ Rappels</h2>

      <div className="rappels-form">
        <input
          type="text"
          placeholder="Message du rappel..."
          value={message}
          onChange={(e) => setMessage(e.target.value)}
        />
        <select value={jour} onChange={(e) => setJour(e.target.value)}>
          {jours.map(j => <option key={j} value={j}>{j}</option>)}
        </select>
        <input
          type="time"
          value={heure}
          onChange={(e) => setHeure(e.target.value)}
        />
        <button onClick={ajouterRappel}>Ajouter</button>
      </div>

      <div className="rappels-liste">
        {rappels.length === 0 ? (
          <p className="empty-message">Aucun rappel pour l'instant</p>
        ) : (
          rappels.map((r) => (
            <div key={r.id} className="rappel-item">
              <span>📌 {r.message} — {r.jour} à {r.heure}</span>
              <button onClick={() => supprimerRappel(r.id)}>🗑️</button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Rappels;