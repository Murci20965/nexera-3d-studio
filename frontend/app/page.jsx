"use client";

import { useState, useEffect } from "react";
import GeneratorForm from "../components/generator/GeneratorForm";
import ModelViewer from "../components/viewer/ModelViewer";
import nudleLogo from "../assets/nudle_logo.png";
import nexeraLogo from "../assets/Nexera_logo.png";

export default function HomePage() {
  const [modelUrl, setModelUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [theme, setTheme] = useState("dark");

  // Sync React state with whatever the inline script set before first paint
  useEffect(() => {
    const current = document.documentElement.dataset.theme || "dark";
    setTheme(current);
  }, []);

  const toggleTheme = () => {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem("nexera-theme", next); } catch (_) {}
  };

  return (
    <div className="app-shell">
      {/* Full-screen 3D viewer — Three.js owns scene + grid */}
      <div className="viewer-fullscreen">
        <ModelViewer src={modelUrl} theme={theme} />
      </div>

      {/* Floating title — pure text over the viewport */}
      <div className="floating-header">
        <span className="app-logo">Nexera 3D Studio</span>
        <span className="app-divider">·</span>
        <span className="app-tagline">Text &amp; Image to 3D</span>
      </div>

      {/* Theme toggle — top right */}
      <button
        className="theme-toggle-btn"
        onClick={toggleTheme}
        aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
        title={theme === "dark" ? "Light mode" : "Dark mode"}
      >
        {theme === "dark" ? "☀︎" : "☾"}
      </button>

      {/* Collapsible side panel */}
      <aside className={`floating-panel${panelOpen ? " open" : ""}`}>
        <div className="panel-content">
          <GeneratorForm
            onModelReady={(url) => { setModelUrl(url); setErrorMsg(""); }}
            onError={setErrorMsg}
          />
          {errorMsg && (
            <div className="status-error" role="alert">{errorMsg}</div>
          )}

          {/* Branding — Nudle (smaller) above Nexera (larger), pinned to panel bottom */}
          <div className="panel-logos">
            <img src={nudleLogo.src} alt="Nudle" className="logo-nudle" />
            <img src={nexeraLogo.src} alt="Nexera" className="logo-nexera" />
          </div>
        </div>
      </aside>

      {/* Panel toggle button */}
      <button
        className={`panel-toggle${panelOpen ? " panel-open" : ""}`}
        onClick={() => setPanelOpen((v) => !v)}
        aria-label={panelOpen ? "Collapse controls" : "Expand controls"}
        title={panelOpen ? "Collapse" : "Expand controls"}
      >
        {panelOpen ? "‹" : "›"}
      </button>

      {/* Download / clear — bottom right */}
      {modelUrl && (
        <div className="floating-download">
          <a
            href={modelUrl}
            download
            className="btn btn-secondary"
            target="_blank"
            rel="noreferrer"
          >
            ↓ Download GLB
          </a>
          <button
            className="btn btn-secondary"
            onClick={() => setModelUrl(null)}
          >
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
