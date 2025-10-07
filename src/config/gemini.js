import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

const genAI = new GoogleGenerativeAI(apiKey ?? "");

const model = genAI.getGenerativeModel({
  model: "gemini-flash-latest",
  systemInstruction: "friendly, inviting to ask follow up questions",
});

const generationConfig = {
  temperature: 0.8,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "text/plain",
};

async function run(prompt) {
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error(
      "Missing Gemini API key. Add VITE_GEMINI_API_KEY to .env.local and restart the dev server."
    );
  }

  const chatSession = model.startChat({
    generationConfig,
    history: [
      {
        role: "user",
        parts: [
          { text: "You are Sydney's personal AI assistant. All information about Sydney's work experience, education, and interests is provided in the question prompt. Provide detailed explainations unless otherwise asked. If a job description is provided, focus your answer on why Sydney is a strong fit for the role based on her experience and skills. Do not include suggestions for improvement unless specifically asked." }
        ],
      },
      {
        role: "user",
        parts: [
          { text: "Sydney's LinkedIn is https://www.linkedin.com/in/sydney-bao/. Sydney's GitHub is https://github.com/SydneyBao. Using React, Sydney coded a personal portfolio at https://sydneybao.com/" },
        ],
      },
      {
        role: "user",
        parts: [
          { text: "On Sydney's free time, she enjoys making digital music through mashups and remixes, drawing on her digital art pad, and cheering on her San Francisco 49ers, San Francisco Giants, and Golden State Warriors. Through 14 years of Taekwondo, Sydney has earned a 2nd degree black belt at age 11, competed in sparring on the national level (placing silver at the 2022 U.S. Nationals and Gold at the 2017 and 2019 California State Championships), and learned the bo-staff and nunchucks. She performed her own double-handed nunchucks routine at the Foster City Arts and Wine Festival, which inspired her studio to teach double handed nunchucks. Currently she is competes on Northeastern Taekwondo's A Team for sparring." },
        ],
      },
      {
        role: "user",
        parts: [
          { text: "On her free time, Sydney programmed a full-stack news aggregator website called HeadshotNews. She used Firebase to store and update the articles daily and Web scraped 5 popular Esports sites using Puppeteer for HTML parsing and informational retrieval. Sydney is proudest of this project because despite placing third in the Northeastern Husky Startup Challenge and her business and marketing teammates deciding to pursue other projects, she pursued the project on her own. She taught herself how to use React, Puppeteer, and Firebase. The link can be found at https://headshotnews.com/" },
        ],
      },
      {
        role: "user",
        parts: [
          { text: "Additionally, she programmed a nutrition chatbot that allows restaurants to upload their nutrition information. She imprived the llmware/bling-1b-0.1 model’s accuracy by over 50% by experimenting with different configurations to store the input data and optimize the model's natural language processing via Retrieval-Augmented Generation. she Utilized the speechRecognition, Tkinter, and pyttsx3 libraries to process speech inputs and convert text outputs into speech, enhancing user interaction and accessibility, making it compatible at drive through windows" },
        ],
      },
    ],
  });

  try {
    const result = await chatSession.sendMessage(prompt);
    const response = result.response;
    return response.text();
  } catch (err) {
    // Normalize common error cases into friendly messages
    const msg = `${err?.message || err}`;
    if (msg.includes("models/gemini-pro is not found") || msg.includes("gemini-pro is not found")) {
      throw new Error(
        "The configured model 'gemini-pro' is no longer available. Update your config to use 'gemini-1.5-flash' or 'gemini-1.5-pro'. You can set VITE_GEMINI_MODEL in .env.local."
      );
    }
    if (msg.includes("API key not valid") || msg.includes("API_KEY_INVALID")) {
      throw new Error(
        "Your Gemini API key is invalid. Double-check the key in .env.local (VITE_GEMINI_API_KEY) and ensure the Generative Language API is enabled for your Google Cloud project."
      );
    }
    throw err;
  }
}

export default run;
