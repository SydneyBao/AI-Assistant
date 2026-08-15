import { pdfjs } from "react-pdf";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url,
).toString();

const MAX_TEXT_BYTES = 2 * 1024 * 1024;

const getFileExtension = (fileName) => fileName.split(".").pop()?.toLowerCase() || "";

const buildFileMetadata = (file) => [
  `Uploaded source file: ${file.name}`,
  `File type: ${file.type || "Unknown"}`,
  `File size: ${Math.max(1, Math.round(file.size / 1024))} KB`,
  "No readable text could be extracted in this browser. Use only the file metadata above and do not infer its contents.",
].join("\n");

const cleanExtractedText = (text, extension) => {
  let cleaned = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  if (["html", "htm"].includes(extension)) {
    cleaned = new DOMParser().parseFromString(cleaned, "text/html").body.textContent || "";
  } else if (extension === "rtf") {
    cleaned = cleaned
      .replace(/\\par[d]?\b/g, "\n")
      .replace(/\\'[0-9a-f]{2}/gi, " ")
      .replace(/\\[a-z]+-?\d* ?/gi, "")
      .replace(/[{}]/g, "");
  }

  return [...cleaned]
    .filter((character) => {
      const code = character.charCodeAt(0);
      return code === 9 || code === 10 || code === 13 || code >= 32;
    })
    .join("")
    .trim();
};

const isReadableText = (text) => {
  if (!text.trim()) return false;
  const sample = text.slice(0, 10_000);
  const characters = [...sample];
  if (characters.some((character) => character.charCodeAt(0) === 0)) return false;
  const replacementCharacters = characters.filter((character) => character.charCodeAt(0) === 65533).length;
  if (replacementCharacters / sample.length > 0.02) return false;
  const readableCharacters = characters.filter((character) => {
    const code = character.charCodeAt(0);
    return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 65533);
  }).length;
  return readableCharacters / sample.length >= 0.85;
};

export const extractFileText = async (file) => {
  const extension = getFileExtension(file.name);
  const isPdf = file.type === "application/pdf" || extension === "pdf";

  if (!isPdf) {
    const rawText = await file.slice(0, MAX_TEXT_BYTES).text();
    if (!isReadableText(rawText)) {
      return { text: buildFileMetadata(file), extracted: false };
    }

    return {
      text: cleanExtractedText(rawText, extension),
      extracted: true,
    };
  }

  const objectUrl = URL.createObjectURL(file);
  try {
    const pdf = await pdfjs.getDocument(objectUrl).promise;
    const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      const page = await pdf.getPage(pageNumber);
      const content = await page.getTextContent();
      pages.push(content.items.map((item) => item.str).join(" "));
    }
    return { text: pages.join("\n"), extracted: true };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
};
