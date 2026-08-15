/* eslint-disable react/prop-types */
import { useState } from "react";
import { pdfjs } from "react-pdf";
import { buildResumeProfileContext } from "../../config/gemini";
import { deployProfile } from "../../services/deployment";
import { normalizeUrl } from "../../config/profile";
import "./creator.css";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const extractResumeText = async (file) => {
  if (file.type !== "application/pdf") return file.text();

  const objectUrl = URL.createObjectURL(file);
  try {
    const pdf = await pdfjs.getDocument(objectUrl).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }
    return pages.join("\n");
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};

const CreatorModal = ({ currentProfile, onClose, onComplete }) => {
  const [name, setName] = useState(currentProfile.isCustom ? currentProfile.name : "");
  const [resumeText, setResumeText] = useState("");
  const [resumeFileName, setResumeFileName] = useState("");
  const [githubUrl, setGithubUrl] = useState(currentProfile.isCustom ? currentProfile.githubUrl : "");
  const [websiteUrl, setWebsiteUrl] = useState(currentProfile.isCustom ? currentProfile.websiteUrl : "");
  const [deploymentUrl, setDeploymentUrl] = useState("");
  const [resumeBusy, setResumeBusy] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState("");

  const handleResume = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    setResumeBusy(true);
    setError("");
    try {
      const text = await extractResumeText(file);
      if (!text.trim()) throw new Error("No readable text was found in that résumé.");
      setResumeText(text);
      setResumeFileName(file.name);
    } catch (resumeError) {
      setError(resumeError.message || "Unable to read that résumé.");
    } finally {
      setResumeBusy(false);
      event.target.value = "";
    }
  };

  const handleCreate = async (event) => {
    event.preventDefault();
    if (!name.trim() || !resumeText.trim()) return;

    setCreating(true);
    setError("");
    try {
      const summary = buildResumeProfileContext({
        profileName: name.trim(),
        resumeText,
      });

      const profile = {
        id: globalThis.crypto?.randomUUID?.() || `${Date.now()}`,
        name: name.trim(),
        summary,
        resumeFileName,
        linkedinUrl: "",
        githubUrl: normalizeUrl(githubUrl),
        websiteUrl: normalizeUrl(websiteUrl),
        deploymentUrl: normalizeUrl(deploymentUrl),
        isCustom: true,
        createdAt: new Date().toISOString(),
      };
      const deployment = await deployProfile(profile);
      onComplete(profile, deployment);
    } catch (creationError) {
      setError(creationError.message || "Unable to create the assistant.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="creator-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !creating) onClose();
    }}>
      <section className="creator-modal" role="dialog" aria-modal="true" aria-labelledby="creator-title">
        <div className="creator-header">
          <div>
            <span>Create your own</span>
            <h2 id="creator-title">Build a résumé assistant</h2>
            <p>Your résumé stays in this browser and becomes the assistant&apos;s source of truth.</p>
          </div>
          <button type="button" onClick={onClose} disabled={creating} aria-label="Close creator">×</button>
        </div>

        <form className="creator-form" onSubmit={handleCreate}>
          <div className="creator-section">
            <div className="creator-step">1</div>
            <div className="creator-section-content">
              <div className="creator-section-heading">
                <h3>Add your résumé</h3>
                <p>This becomes the assistant&apos;s primary source of truth.</p>
              </div>
              <label className="creator-field">
                <span>Full name</span>
                <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Jordan Lee" required />
              </label>
              <label className={`creator-upload${resumeFileName ? " complete" : ""}`}>
                <input type="file" accept=".pdf,.txt" onChange={handleResume} />
                <span className="creator-upload-icon" aria-hidden="true">+</span>
                <span>
                  <strong>{resumeBusy ? "Reading résumé…" : resumeFileName || "Upload résumé"}</strong>
                  <small>PDF or TXT</small>
                </span>
              </label>
            </div>
          </div>

          <div className="creator-section">
            <div className="creator-step">2</div>
            <div className="creator-section-content">
              <div className="creator-section-heading">
                <h3>Links and publishing</h3>
                <p>Optional links appear below the chat. Publishing requires a connected deployment service.</p>
              </div>
              <div className="creator-field-grid">
                <label className="creator-field">
                  <span>GitHub URL</span>
                  <input value={githubUrl} onChange={(event) => setGithubUrl(event.target.value)} placeholder="github.com/username" inputMode="url" />
                </label>
                <label className="creator-field">
                  <span>Website URL</span>
                  <input value={websiteUrl} onChange={(event) => setWebsiteUrl(event.target.value)} placeholder="yourname.com" inputMode="url" />
                </label>
              </div>
              <label className="creator-field">
                <span>Custom deployment URL</span>
                <input value={deploymentUrl} onChange={(event) => setDeploymentUrl(event.target.value)} placeholder="assistant.yourname.com" inputMode="url" />
              </label>
            </div>
          </div>

          {error ? <div className="creator-error" role="alert">{error}</div> : null}

          <div className="creator-footer">
            <p>Creating the assistant turns the résumé into reusable profile context.</p>
            <div>
              <button className="secondary-button" type="button" onClick={onClose} disabled={creating}>Cancel</button>
              <button className="primary-button" type="submit" disabled={!name.trim() || !resumeText.trim() || creating}>
                {creating ? "Creating assistant…" : "Create assistant"}
              </button>
            </div>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CreatorModal;
