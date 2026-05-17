"use client";

import { useState } from "react";
import GeneratorForm from "../components/generator/GeneratorForm";
import ModelViewer from "../components/viewer/ModelViewer";

export default function HomePage() {
  const [modelUrl, setModelUrl] = useState(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);

  return (
    <div className="app-shell">
      {/* Full-screen 3D viewer — Three.js owns scene + grid */}
      <div className="viewer-fullscreen">
        <ModelViewer src={modelUrl} />
      </div>

      {/* Floating title — pure text over the viewport, no border or background */}
      <div className="floating-header">
        <span className="app-logo">Nexera 3D Studio</span>
        <span className="app-divider">·</span>
        <span className="app-tagline">Text &amp; Image to 3D</span>
      </div>

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
        </div>
      </aside>

      {/* Toggle button */}
      <button
        className={`panel-toggle${panelOpen ? " panel-open" : ""}`}
        onClick={() => setPanelOpen((v) => !v)}
        aria-label={panelOpen ? "Collapse controls" : "Expand controls"}
        title={panelOpen ? "Collapse" : "Expand controls"}
      >
        {panelOpen ? "‹" : "›"}
      </button>

      {/* Download / clear — bottom right of viewport */}
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
