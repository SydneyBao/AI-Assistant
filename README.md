This project uses the Gemini Interactions API. Feel free to ask the chatbot anything at [Sydney's AI Assistant](https://gemini-chatbot-iota-five.vercel.app/).

Conversations stream into the UI as they are generated and continue through Gemini's server-side state using `previous_interaction_id`. Transcripts and interaction IDs are saved in local storage so chats can be reopened after a refresh. If server-side state expires, the app reconstructs it once from the saved transcript.

The structured `public/profile-summary.md` combines the current resume and LinkedIn Basic export with verified first-party research, project, leadership, and award records. It is loaded when a conversation starts, and saved chats automatically refresh their Gemini interaction state when the profile changes. `public/resume.pdf` and `public/linkedin.txt` retain the underlying current source material.

Set `VITE_GEMINI_API_KEY` in `.env.local`. The optional `VITE_GEMINI_MODEL` variable defaults to `gemini-3.6-flash` with medium thinking, balancing evidence-based reasoning with complete responses under the concise output limit. Free-tier usage is subject to Google's rate limits and data-use terms.

Responses are instructed to be concise paragraphs, normally staying near or below 1,024 output tokens, with a hard `max_output_tokens` limit of 2,048.

The assistant uses an analysis-first evidence workflow: it infers the user's underlying question, forms a conclusion, selects a small number of supporting experiences, and explains what they demonstrate instead of repeating the resume chronologically. Internal chain-of-thought is not shown.

## Create your own assistant

The **Create yours** flow accepts any file type. It extracts readable text locally from PDFs and text-based formats (including Markdown, CSV, JSON, HTML, and source files) and turns that text into reusable profile context without making an additional Gemini request. For binary formats that the browser cannot parse, the file is still accepted and the creator clearly reports that only its metadata will be available. The resulting name, profile context, and optional links are saved in the browser and replace the default profile throughout the UI and Gemini instructions. Switching profiles starts a clean chat history so records from different people are not mixed.

Custom assistants show a **Back to Sydney Bao** action in the header. It restores the bundled default profile and opens a fresh chat while preserving previously saved chat records.

The job-description attachment control uses the same unrestricted file handling and local extraction behavior.

Custom-domain publishing requires hosting credentials and domain verification, which should never be exposed in browser code. Configure `VITE_DEPLOY_API_URL` with an HTTPS backend that accepts `POST { targetUrl, profile }`, publishes the generated assistant through your chosen host, verifies the custom domain, and returns `{ url }`. Without that endpoint, a requested deployment URL is saved locally and the UI clearly reports that publishing still needs a deployment service.
