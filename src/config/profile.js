export const PROFILE_STORAGE_KEY = "resume-assistant-profile-v1";

export const DEFAULT_PROFILE = Object.freeze({
  id: "sydney-bao",
  name: "Sydney Bao",
  summary: "",
  resumeFileName: "SydneyBaoResume.pdf",
  linkedinUrl: "https://www.linkedin.com/in/sydney-bao/",
  githubUrl: "https://github.com/SydneyBao",
  websiteUrl: "https://sydneybao.com/",
  deploymentUrl: "",
  isCustom: false,
});

export const loadProfile = () => {
  try {
    const savedProfile = JSON.parse(localStorage.getItem(PROFILE_STORAGE_KEY) ?? "null");
    if (!savedProfile?.name || !savedProfile?.summary) return { ...DEFAULT_PROFILE };
    return { ...DEFAULT_PROFILE, ...savedProfile, isCustom: true };
  } catch {
    return { ...DEFAULT_PROFILE };
  }
};

export const saveProfile = (profile) => {
  localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
};

export const getFirstName = (name) => name.trim().split(/\s+/)[0] || "this candidate";

export const possessive = (name) => name.endsWith("s") ? `${name}'` : `${name}'s`;

export const normalizeUrl = (value) => {
  const trimmedValue = value.trim();
  if (!trimmedValue) return "";
  return /^https?:\/\//i.test(trimmedValue) ? trimmedValue : `https://${trimmedValue}`;
};
