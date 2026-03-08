import React, { useState } from "react";
import axios from "axios";
import "./Chat.css";

function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const envoyerMessage = async () => {
    if (!input.trim()) return;

    const nouveauMessage = { role: "user", text: input };
    setMessages((prev) => [...prev, nouveauMessage]);
    setInput("");
    setLoading(true);

    try {
      const res = await axios.post("http://192.168.1.87:5000/api/chat", {
        message: input,
      });
      const reponse = { role: "bot", text: res.data.response };
      setMessages((prev) => [...prev, reponse]);
    } catch (error) {
      setMessages((prev) => [...prev, { role: "bot", text: "Erreur de connexion au serveur." }]);
    }

    setLoading(false);
  };

  const handleKey = (e) => {
    if (e.key === "Enter") envoyerMessage();
  };

  return (
    <div className="chat-container">
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-placeholder">Pose une question pour commencer...</p>
        )}
        {messages.map((msg, index) => (
          <div key={index} className={`chat-bubble ${msg.role}`}>
            <p>{msg.text}</p>
          </div>
        ))}
        {loading && (
          <div className="chat-bubble bot">
            <p>En train de répondre...</p>
          </div>
        )}
      </div>
      <div className="chat-input">
        <input
          type="text"
          placeholder="Écris ta question ici..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
        />
        <button onClick={envoyerMessage}>Envoyer</button>
      </div>
    </div>
  );
}

export default Chat;