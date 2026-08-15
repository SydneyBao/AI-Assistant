import { useContext, useEffect, useRef, useState } from "react";
import "./main.css";
import { assets } from "../../assets/assets";
import { Context } from "../../context/context";
import { pdfjs } from "react-pdf";
import CreatorModal from "../creator/CreatorModal";
import {
  getFirstName,
  loadProfile,
  possessive,
  saveProfile,
} from "../../config/profile";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const toParagraphs = (content) => content
  .replace(/^\s*#{1,6}\s+/gm, "\n")
  .replace(/^\s*(?:[-+*]|\d+[.)])\s+/gm, "\n")
  .replace(/\*\*([^*\n]+)\*\*/g, "$1")
  .replace(/__([^_\n]+)__/g, "$1")
  .split(/\n{2,}/)
  .map((paragraph) => paragraph.replace(/\s*\n\s*/g, " ").trim())
  .filter(Boolean);

const LOADING_STEPS = [
  "Understanding the question",
  "Finding the strongest evidence",
  "Connecting experience to the answer",
  "Preparing a concise response",
];

const LoadingResponse = () => {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setStep((current) => (current + 1) % LOADING_STEPS.length);
    }, 1800);
    return () => window.clearInterval(interval);
  }, []);

  return (
    <div className="thinking-card" role="status" aria-live="polite">
      <div className="thinking-pulse" aria-hidden="true">
        <span />
        <span />
        <span />
      </div>
      <div className="thinking-copy">
        <p>Thinking</p>
        <span key={step} className="thinking-step">{LOADING_STEPS[step]}</span>
      </div>
    </div>
  );
};

const Main = () => {
  const {
    onSent,
    activeChatId,
    activeMessages,
    pendingChatId,
    setInput,
    input,
    jobDescription,
    setJobDescription,
    jobDescAttached,
    setJobDescAttached,
    jobFileName,
    setJobFileName,
    clearChats,
  } = useContext(Context);
  const resultRef = useRef(null);
  const [profile, setProfile] = useState(loadProfile);
  const [profileSummary, setProfileSummary] = useState(profile.summary || "");
  const [profileLoaded, setProfileLoaded] = useState(Boolean(profile.summary));
  const [creatorOpen, setCreatorOpen] = useState(false);
  const [deploymentNotice, setDeploymentNotice] = useState(null);

  const loading = pendingChatId === activeChatId;
  const showResult = activeMessages.length > 0;
  const firstName = getFirstName(profile.name);
  const firstNamePossessive = possessive(firstName);
  const hasProfileLinks = Boolean(profile.githubUrl || profile.linkedinUrl || profile.websiteUrl);

  useEffect(() => {
    const fetchProfileSummary = async () => {
      if (profile.summary) {
        setProfileSummary(profile.summary);
        setProfileLoaded(true);
        return;
      }

      try {
        const response = await fetch("/profile-summary.md");
        if (!response.ok) throw new Error(`Profile summary returned ${response.status}`);
        setProfileSummary(await response.text());
      } catch (error) {
        console.error("Unable to load compact profile context", error);
      } finally {
        setProfileLoaded(true);
      }
    };

    fetchProfileSummary();
  }, [profile.summary]);

  useEffect(() => {
    document.title = `${profile.name} · Resume Assistant`;
  }, [profile.name]);

  useEffect(() => {
    if (resultRef.current) {
      resultRef.current.scrollTop = resultRef.current.scrollHeight;
    }
  }, [activeMessages, loading]);

  const sendQuestion = (questionText) => {
    const question = questionText.trim();
    if (!question || pendingChatId) return;

    const modelPrompt = jobDescription
      ? `${question}\n\nJob description attached to this question:\n${jobDescription}`
      : question;

    onSent({
      prompt: question,
      modelPrompt,
      profileContext: profileSummary,
      profileName: profile.name,
      attachmentName: jobDescAttached ? jobFileName : "",
    });
  };

  const handleSend = () => sendQuestion(input);

  const handleFile = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    let jobDescText = "";
    if (file.type === "application/pdf") {
      const pdf = await pdfjs.getDocument(URL.createObjectURL(file)).promise;
      for (let i = 1; i <= pdf.numPages; i += 1) {
        const page = await pdf.getPage(i);
        const content = await page.getTextContent();
        jobDescText += `${content.items.map((item) => item.str).join(" ")}\n`;
      }
    } else {
      jobDescText = await file.text();
    }

    setJobDescription(jobDescText);
    setJobDescAttached(true);
    setJobFileName(file.name);
    event.target.value = "";
  };

  const handleProfileCreated = (createdProfile, deployment) => {
    saveProfile(createdProfile);
    setProfile(createdProfile);
    setProfileSummary(createdProfile.summary);
    setProfileLoaded(true);
    setDeploymentNotice(deployment);
    clearChats();
    setCreatorOpen(false);
  };

  return (
    <div className="main">
      <header className="nav">
        <div className="assistant-heading">
          <p>Why {profile.name}?</p>
          <span>Resume Assistant</span>
        </div>
        <button className="creator-trigger" type="button" onClick={() => setCreatorOpen(true)}>
          <span aria-hidden="true">+</span>
          Create yours
        </button>
      </header>
      {deploymentNotice ? (
        <div className={`deployment-notice ${deploymentNotice.status}`} role="status">
          <span>{deploymentNotice.message}</span>
          {deploymentNotice.url ? <a href={deploymentNotice.url} target="_blank" rel="noreferrer">Open site</a> : null}
          <button type="button" onClick={() => setDeploymentNotice(null)} aria-label="Dismiss deployment message">×</button>
        </div>
      ) : null}
      <div className="main-container">
        {!showResult ? (
          <div className="welcome">
            <div className="greet">
              <span className="greet-eyebrow">{profile.name} · Resume assistant</span>
              <h1>What would you like to know?</h1>
              <p>Get concise answers about {firstNamePossessive} experience, projects, research, and qualifications.</p>
            </div>
            <div className="cards">
              {[
                `Summarize ${firstNamePossessive} coding experience`,
                `Describe ${firstNamePossessive} ideal work environment`,
                `Which coding project is ${firstName} most proud of?`,
                `What does ${firstName} like to do for fun?`,
              ].map((suggestion) => (
                <button
                  className="card"
                  type="button"
                  key={suggestion}
                  onClick={() => sendQuestion(suggestion)}
                  disabled={!profileLoaded || Boolean(pendingChatId)}
                >
                  <p>{suggestion}</p>
                  <span aria-hidden="true">↗</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="result" ref={resultRef}>
            {activeMessages.map((message) => message.role === "user" ? (
              <div className="result-title" key={message.id}>
                <div>{message.content}</div>
                {message.attachmentName ? (
                  <div className="message-attachment">{message.attachmentName} attached</div>
                ) : null}
              </div>
            ) : (
              <div className="result-data" key={message.id}>
                {message.streaming && !message.content ? (
                  <LoadingResponse />
                ) : (
                  <div className={`response-copy${message.isError ? " error-message" : ""}`}>
                    {toParagraphs(message.content).map((paragraph, index, paragraphs) => (
                      <p key={`${message.id}-${index}`}>
                        {paragraph}
                        {message.streaming && index === paragraphs.length - 1
                          ? <span className="streaming-cursor" aria-hidden="true" />
                          : null}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        <div className="main-bottom">
          <div className="bottom-row">
            <div className="search-box">
              <label className="custom-file-upload">
                <input
                  type="file"
                  accept=".txt,.pdf"
                  style={{ display: "none" }}
                  onChange={handleFile}
                  disabled={Boolean(pendingChatId)}
                />
                {jobDescAttached && jobFileName ? (
                  <span className="job-file-name">{jobFileName}</span>
                ) : (
                  <span className="upload-tooltip">
                    <svg className="composer-icon" viewBox="0 0 24 24" aria-hidden="true">
                      <path d="M12 5v14M5 12h14" />
                    </svg>
                    <span className="tooltip-text">Upload job description (.pdf or .txt)</span>
                  </span>
                )}
              </label>
              <input
                onChange={(event) => setInput(event.target.value)}
                value={input}
                type="text"
                placeholder={profileLoaded
                  ? "Ask me anything or upload a job description..."
                  : `Loading ${firstNamePossessive} profile...`}
                disabled={Boolean(pendingChatId) || !profileLoaded}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.metaKey && input.trim()) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
              />
              <button
                className="send-button"
                type="button"
                onClick={handleSend}
                disabled={!input.trim() || Boolean(pendingChatId) || !profileLoaded}
                aria-label="Send message"
              >
                <svg className="composer-icon" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M12 19V5M6.5 10.5 12 5l5.5 5.5" />
                </svg>
              </button>
            </div>
          </div>

          {hasProfileLinks ? (
            <div className="bottom-info">
              <span>Learn more</span>
              {profile.githubUrl ? (
                <a href={profile.githubUrl} target="_blank" rel="noopener noreferrer" className="profile-link" aria-label={`${profile.name}'s GitHub`}>
                  <img src={assets.github_icon} alt="GitHub" />
                </a>
              ) : null}
              {profile.linkedinUrl ? (
                <a href={profile.linkedinUrl} target="_blank" rel="noopener noreferrer" className="profile-link" aria-label={`${profile.name}'s LinkedIn`}>
                  <img src={assets.linkedin_icon} alt="LinkedIn" />
                </a>
              ) : null}
              {profile.websiteUrl ? (
                <a href={profile.websiteUrl} target="_blank" rel="noopener noreferrer" className="profile-link" aria-label={`${profile.name}'s website`}>
                  <img src={assets.logo} alt={`${profile.name}'s website`} />
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
      {creatorOpen ? (
        <CreatorModal
          currentProfile={profile}
          onClose={() => setCreatorOpen(false)}
          onComplete={handleProfileCreated}
        />
      ) : null}
    </div>
  );
};

export default Main;
