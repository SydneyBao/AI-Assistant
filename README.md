This project uses the Gemini Interactions API. Feel free to ask the chatbot anything at [Sydney's AI Assistant](https://gemini-chatbot-iota-five.vercel.app/).

Conversations stream into the UI as they are generated and continue through Gemini's server-side state using `previous_interaction_id`. Transcripts and interaction IDs are saved in local storage so chats can be reopened after a refresh. If server-side state expires, the app reconstructs it once from the saved transcript.

The structured `public/profile-summary.md` combines the current resume and LinkedIn Basic export with verified first-party research, project, leadership, and award records. It is loaded when a conversation starts, and saved chats automatically refresh their Gemini interaction state when the profile changes. `public/resume.pdf` and `public/linkedin.txt` retain the underlying current source material.

Set `VITE_GEMINI_API_KEY` in `.env.local`. The optional `VITE_GEMINI_MODEL` variable defaults to `gemini-3.6-flash` with medium thinking, balancing evidence-based reasoning with complete responses under the concise output limit. Free-tier usage is subject to Google's rate limits and data-use terms.

Responses are instructed to be concise paragraphs, normally staying near or below 1,024 output tokens, with a hard `max_output_tokens` limit of 2,048.

The assistant uses an analysis-first evidence workflow: it infers the user's underlying question, forms a conclusion, selects a small number of supporting experiences, and explains what they demonstrate instead of repeating the resume chronologically. Internal chain-of-thought is not shown.
