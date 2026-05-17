"use client";

import { useState, useRef } from "react";
import { useGeneration } from "../../hooks/useGeneration";
import ProgressBar from "../ui/ProgressBar";

export default function GeneratorForm({ onModelReady, onError }) {
  const [activeTab, setActiveTab] = useState("text");

  // Text-tab state
  const [textPrompt, setTextPrompt] = useState("");
  const [quality, setQuality] = useState("balanced"); // "balanced" | "high-detail"
  const [lowPoly, setLowPoly] = useState(false);

  // Image-tab state
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [imagePrompt, setImagePrompt] = useState("");
  const [isDragOver, setIsDragOver] = useState(false);

  const fileInputRef = useRef(null);

  const { isLoading, progress, statusMsg, startText, startImage } =
    useGeneration({ onModelReady, onError });

  // ── Handlers ───────────────────────────────────────────────
  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textPrompt.trim() || isLoading) return;
    startText(textPrompt.trim(), quality, lowPoly);
  };

  const handleImageSubmit = (e) => {
    e.preventDefault();
    if (!imageFile || isLoading) return;
    startImage(imageFile, imagePrompt);
  };

  const handleTabChange = (tab) => {
    if (!isLoading) { setActiveTab(tab); onError(""); }
  };

  const acceptFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  return (
    <>
      {/* Tabs */}
      <div className="tabs" role="tablist">
        <button
          className={`tab-btn${activeTab === "text" ? " active" : ""}`}
          role="tab" aria-selected={activeTab === "text"}
          onClick={() => handleTabChange("text")} disabled={isLoading}
        >
          Text to 3D
        </button>
        <button
          className={`tab-btn${activeTab === "image" ? " active" : ""}`}
          role="tab" aria-selected={activeTab === "image"}
          onClick={() => handleTabChange("image")} disabled={isLoading}
        >
          Image to 3D
        </button>
      </div>

      {/* ── Text form ─────────────────────────────────────── */}
      {activeTab === "text" && (
        <form onSubmit={handleTextSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="form-group">
            <label className="form-label" htmlFor="text-prompt">Prompt</label>
            <textarea
              id="text-prompt" className="form-textarea"
              placeholder="Describe the 3D model you want to generate…"
              value={textPrompt} onChange={(e) => setTextPrompt(e.target.value)}
              disabled={isLoading} required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Quality</label>
            <div className="tabs" style={{ padding: "3px" }}>
              <button type="button"
                className={`tab-btn${quality === "balanced" ? " active" : ""}`}
                onClick={() => setQuality("balanced")} disabled={isLoading}
              >Balanced</button>
              <button type="button"
                className={`tab-btn${quality === "high-detail" ? " active" : ""}`}
                onClick={() => setQuality("high-detail")} disabled={isLoading}
              >High Detail</button>
            </div>
            {quality === "high-detail" && !lowPoly && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                Enables auto-retopology for clean quad meshes — best for rigging & animation.
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="toggle-row">
              <input
                type="checkbox" checked={lowPoly}
                onChange={(e) => setLowPoly(e.target.checked)}
                disabled={isLoading}
              />
              <span className="toggle-label">Low-Poly mode</span>
              <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
                — fewer faces, flat-shaded
              </span>
            </label>
          </div>

          <button type="submit" className="btn btn-primary"
            disabled={isLoading || !textPrompt.trim()}>
            {isLoading ? "Generating…" : "Generate 3D Model"}
          </button>
        </form>
      )}

      {/* ── Image form ────────────────────────────────────── */}
      {activeTab === "image" && (
        <form onSubmit={handleImageSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="form-group">
            <label className="form-label">Image</label>
            <div
              className={`drop-zone${isDragOver ? " drag-over" : ""}`}
              onClick={() => !isLoading && fileInputRef.current?.click()}
              onDrop={(e) => { e.preventDefault(); setIsDragOver(false); acceptFile(e.dataTransfer.files[0]); }}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              role="button" tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && !isLoading && fileInputRef.current?.click()}
              aria-label="Upload image"
            >
              {imagePreview ? (
                <>
                  <img src={imagePreview} alt="Preview" className="drop-zone-preview" />
                  <span className="drop-zone-filename">{imageFile?.name}</span>
                </>
              ) : (
                <>
                  <span className="drop-zone-icon">🖼</span>
                  <span className="drop-zone-label"><strong>Click to upload</strong> or drag & drop</span>
                  <span className="drop-zone-sub">PNG, JPG, WEBP up to 20 MB</span>
                </>
              )}
            </div>
            <input
              ref={fileInputRef} type="file" accept="image/*"
              style={{ display: "none" }}
              onChange={(e) => acceptFile(e.target.files[0])}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="image-prompt">
              Additional prompt{" "}
              <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="image-prompt" className="form-textarea"
              placeholder="Add context or style hints…"
              value={imagePrompt} onChange={(e) => setImagePrompt(e.target.value)}
              disabled={isLoading} style={{ minHeight: "72px" }}
            />
            <p className="image-prompt-note">
              The uploaded image sets the base color and texture. Prompts influence shape and style but cannot override the image&rsquo;s colors. For full color control, use Text to 3D.
            </p>
          </div>

          <button type="submit" className="btn btn-primary"
            disabled={isLoading || !imageFile}>
            {isLoading ? "Generating…" : "Generate 3D Model"}
          </button>
        </form>
      )}

      {/* Progress */}
      {isLoading && <ProgressBar progress={progress} statusMsg={statusMsg} />}

      {!isLoading && statusMsg === "Generation complete!" && (
        <p className="status-success">{statusMsg}</p>
      )}
    </>
  );
}
