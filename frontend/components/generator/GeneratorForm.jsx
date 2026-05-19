"use client";

import { useState, useRef } from "react";
import { useGeneration } from "../../hooks/useGeneration";
import ProgressBar from "../ui/ProgressBar";

const VIEWS = ["front", "back", "left", "right"];
const VIEW_LABELS = { front: "Front", back: "Back", left: "Left", right: "Right" };

// ── Multiview cell (4 of these per form) ────────────────────
function MultiviewCell({ view, file, preview, isLoading, onAccept, onRemove }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const inputRef = useRef(null);
  const label = VIEW_LABELS[view];

  const handleRemove = (e) => {
    e.stopPropagation();
    if (inputRef.current) inputRef.current.value = "";
    onRemove();
  };

  return (
    <div className="multiview-cell">
      <span className="multiview-cell-label">{label}</span>
      <div
        className={`drop-zone${isDragOver ? " drag-over" : ""}`}
        onClick={() => !isLoading && inputRef.current?.click()}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          onAccept(e.dataTransfer.files[0]);
        }}
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && !isLoading && inputRef.current?.click()}
        aria-label={`Upload ${label} image`}
      >
        {preview ? (
          <>
            <button
              type="button"
              className="drop-zone-remove"
              onClick={handleRemove}
              onKeyDown={(e) => e.stopPropagation()}
              disabled={isLoading}
              aria-label={`Remove ${label} image`}
              title="Remove image"
            >
              ×
            </button>
            <img src={preview} alt={`${label} preview`} className="drop-zone-preview" />
            <span className="drop-zone-filename">{file?.name}</span>
          </>
        ) : (
          <>
            <span className="drop-zone-icon">＋</span>
            <span className="drop-zone-label">{label}</span>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={(e) => onAccept(e.target.files[0])}
        disabled={isLoading}
      />
    </div>
  );
}

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
  const [imageQuality, setImageQuality] = useState("standard");
  const [isDragOver, setIsDragOver] = useState(false);

  // Multiview-tab state
  const [mvFiles, setMvFiles] = useState({ front: null, back: null, left: null, right: null });
  const [mvPreviews, setMvPreviews] = useState({ front: null, back: null, left: null, right: null });
  const [mvPrompt, setMvPrompt] = useState("");
  const [mvQuality, setMvQuality] = useState("standard"); // "standard" | "detailed"

  const fileInputRef = useRef(null);

  const { isLoading, progress, statusMsg, startText, startImage, startMultiview } =
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
    startImage(imageFile, imagePrompt, imageQuality);
  };

  const handleMvSubmit = (e) => {
    e.preventDefault();
    if (!VIEWS.every((v) => mvFiles[v]) || isLoading) return;
    startMultiview(mvFiles, mvPrompt, mvQuality);
  };

  const handleTabChange = (tab) => {
    if (!isLoading) { setActiveTab(tab); onError(""); }
  };

  const acceptFile = (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = (e) => {
    e.stopPropagation();
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleMvAccept = (view, file) => {
    if (!file || !file.type.startsWith("image/")) return;
    if (mvPreviews[view]) URL.revokeObjectURL(mvPreviews[view]);
    setMvFiles((s) => ({ ...s, [view]: file }));
    setMvPreviews((s) => ({ ...s, [view]: URL.createObjectURL(file) }));
  };

  const handleMvRemove = (view) => {
    if (mvPreviews[view]) URL.revokeObjectURL(mvPreviews[view]);
    setMvFiles((s) => ({ ...s, [view]: null }));
    setMvPreviews((s) => ({ ...s, [view]: null }));
  };

  const allMvFilled = VIEWS.every((v) => mvFiles[v]);

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
        <button
          className={`tab-btn${activeTab === "multiview" ? " active" : ""}`}
          role="tab" aria-selected={activeTab === "multiview"}
          onClick={() => handleTabChange("multiview")} disabled={isLoading}
        >
          Multiview
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
                  <button
                    type="button"
                    className="drop-zone-remove"
                    onClick={handleRemoveImage}
                    onKeyDown={(e) => e.stopPropagation()}
                    disabled={isLoading}
                    aria-label="Remove image"
                    title="Remove image"
                  >
                    ×
                  </button>
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

          <div className="form-group">
            <label className="form-label">Quality</label>
            <div className="tabs" style={{ padding: "3px" }}>
              <button type="button"
                className={`tab-btn${imageQuality === "standard" ? " active" : ""}`}
                onClick={() => setImageQuality("standard")} disabled={isLoading}
              >Standard</button>
              <button type="button"
                className={`tab-btn${imageQuality === "detailed" ? " active" : ""}`}
                onClick={() => setImageQuality("detailed")} disabled={isLoading}
              >Detailed</button>
            </div>
            {imageQuality === "detailed" && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                Denser mesh — roughly 2× generation time and 1.5× credits.
              </p>
            )}
          </div>

          <button type="submit" className="btn btn-primary"
            disabled={isLoading || !imageFile}>
            {isLoading ? "Generating…" : "Generate 3D Model"}
          </button>
        </form>
      )}

      {/* ── Multiview form ────────────────────────────────── */}
      {activeTab === "multiview" && (
        <form onSubmit={handleMvSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="form-group">
            <label className="form-label">Views (all 4 required)</label>
            <div className="multiview-grid">
              {VIEWS.map((view) => (
                <MultiviewCell
                  key={view}
                  view={view}
                  file={mvFiles[view]}
                  preview={mvPreviews[view]}
                  isLoading={isLoading}
                  onAccept={(f) => handleMvAccept(view, f)}
                  onRemove={() => handleMvRemove(view)}
                />
              ))}
            </div>
            <p className="image-prompt-note">
              All 4 views must be <strong>direct head-on shots</strong> of the same object — <em>not</em> 3/4-angle marketing photos.
              Front and Back show only the front/rear face; Left and Right are pure side profiles.
              Same scale, same lighting, clean backgrounds.
              Reflective subjects (cars, glass, chrome) often produce warped meshes — the single-image <strong>Image to 3D</strong> tab usually works better for those.
            </p>
          </div>

          <div className="form-group">
            <label className="form-label">Quality</label>
            <div className="tabs" style={{ padding: "3px" }}>
              <button type="button"
                className={`tab-btn${mvQuality === "standard" ? " active" : ""}`}
                onClick={() => setMvQuality("standard")} disabled={isLoading}
              >Standard</button>
              <button type="button"
                className={`tab-btn${mvQuality === "detailed" ? " active" : ""}`}
                onClick={() => setMvQuality("detailed")} disabled={isLoading}
              >Detailed</button>
            </div>
            {mvQuality === "detailed" && (
              <p style={{ fontSize: "12px", color: "var(--text-muted)", marginTop: "6px" }}>
                Denser mesh — roughly 2× generation time and 1.5× credits.
              </p>
            )}
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mv-prompt">
              Additional prompt{" "}
              <span style={{ textTransform: "none", fontWeight: 400 }}>(optional)</span>
            </label>
            <textarea
              id="mv-prompt" className="form-textarea"
              placeholder="Add context or style hints…"
              value={mvPrompt} onChange={(e) => setMvPrompt(e.target.value)}
              disabled={isLoading} style={{ minHeight: "72px" }}
            />
          </div>

          <button type="submit" className="btn btn-primary"
            disabled={isLoading || !allMvFilled}>
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
