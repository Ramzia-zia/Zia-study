import React, { useState } from "react";
import Chat from "./components/Chat";
import Resume from "./components/Resume";
import Planning from "./components/Planning";
import Rappels from "./components/Rappels";
//import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import "./App.css";

function App() {
  const [onglet, setOnglet] = useState("chat");

  return (
    <div className="app">
      <header className="header">
        <h1 className="logo">Zia Study</h1>
        <p className="slogan">Your intelligent study assistant</p>
      </header>

      <nav className="nav">
        <button className={onglet === "chat" ? "active" : ""} onClick={() => setOnglet("chat")}>Chat</button>
        <button className={onglet === "resume" ? "active" : ""} onClick={() => setOnglet("resume")}>Resume</button>
        <button className={onglet === "planning" ? "active" : ""} onClick={() => setOnglet("planning")}>Planning</button>
        <button className={onglet === "rappels" ? "active" : ""} onClick={() => setOnglet("rappels")}>Rappels</button>
      </nav>

      <main className="main">
        {onglet === "chat" && <Chat />}
        {onglet === "resume" && <Resume />}
        {onglet === "planning" && <Planning />}
        {onglet === "rappels" && <Rappels />}
      </main>

      {/* <ToastContainer position="bottom-right" />*/}
    </div>
  );
}

export default App;