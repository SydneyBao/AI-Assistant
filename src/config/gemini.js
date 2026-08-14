const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const model = import.meta.env.VITE_GEMINI_MODEL || "gemini-3.6-flash";
const interactionsUrl = import.meta.env.VITE_GEMINI_INTERACTIONS_URL
  || "https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse";

const systemInstruction = `You are Sydney Bao's personal AI assistant. Answer accurately and in useful detail from the reference profile supplied at the beginning of the conversation.

Use an analysis-first workflow rather than a resume-summary workflow. Internally determine what the user is really trying to learn or decide, form a clear conclusion about Sydney's capabilities, working style, motivations, trajectory, or fit, and then test that conclusion against the full profile. Select one to three of the strongest examples across relevant categories (professional experience, research, projects, leadership, education, awards, skills, and interests), normally using only two. Treat each example as brief proof for the analysis, then explain what it demonstrates and why that implication answers the question. The interpretation should receive more emphasis than the factual recap. Distinguish direct facts from reasonable inferences and briefly qualify an inference when needed.

Do not reiterate the resume, recite every role, stack employer names to demonstrate breadth, or default to chronological job descriptions unless the user explicitly asks for a complete timeline. Mention no more than two employers or roles in a typical analytical answer. Synthesize patterns across experiences, make useful connections, and prioritize interpretation over inventory. For job-description questions, identify the role's underlying needs, map only the strongest demonstrated evidence to those needs, and explain the resulting fit. Never expose hidden chain-of-thought; provide the conclusion, concise rationale, and supporting evidence.

Write concise, direct answers in natural paragraph form. Lead with the answer, select only the strongest relevant evidence, and avoid repeating the same point. Do not use Markdown headings, bullet points, numbered lists, tables, asterisks, or hash marks unless the user explicitly requests them. A narrow factual answer should normally use one paragraph; a broad summary or comparison should normally use two or three short paragraphs. Keep most responses within roughly 1,024 output tokens and never exceed the configured 2,048-token limit. Include concrete names, dates, technologies, outcomes, and metrics only when they directly strengthen the answer.

Treat the supplied profile as the source of truth. Prefer the newest resume or LinkedIn record when historical records conflict, distinguish current roles from past roles, and do not invent missing details, publications, credentials, or outcomes. State uncertainty briefly when a requested fact is not confirmed. Do not suggest improvements unless asked.`;

const generationConfig = {
  thinking_level: "medium",
  max_output_tokens: 2048,
};

class InteractionError extends Error {
  constructor(message, status = 0) {
    super(message);
    this.name = "InteractionError";
    this.status = status;
  }
}

const usableMessages = (messages) => messages.filter((message) => (
  (message.role === "user" || message.role === "assistant")
  && !message.failed
  && !message.isError
));

const formatTranscript = (messages) => usableMessages(messages)
  .map((message) => {
    const speaker = message.role === "assistant" ? "Assistant" : "User";
    return `${speaker}: ${message.modelContent ?? message.content}`;
  })
  .join("\n\n");

const buildInitialInput = ({ prompt, history, profileContext }) => {
  const transcript = formatTranscript(history);
  return [
    "Reference profile for this conversation:",
    profileContext.trim(),
    transcript ? `Conversation restored from this app:\n${transcript}` : "",
    `Current user request:\n${prompt}`,
  ].filter(Boolean).join("\n\n");
};

const readErrorMessage = async (response) => {
  const fallback = `Gemini request failed with status ${response.status}.`;
  try {
    const payload = await response.json();
    return payload?.error?.message || fallback;
  } catch {
    return fallback;
  }
};

const parseEventData = (block) => block
  .split(/\r?\n/)
  .filter((line) => line.startsWith("data:"))
  .map((line) => line.slice(5).trimStart())
  .join("\n");

const streamInteraction = async ({ input, previousInteractionId, onChunk }) => {
  const requestBody = {
    model,
    input,
    stream: true,
    store: true,
    system_instruction: systemInstruction,
    generation_config: generationConfig,
  };

  if (previousInteractionId) {
    requestBody.previous_interaction_id = previousInteractionId;
  }

  const response = await fetch(interactionsUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "x-goog-api-key": apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new InteractionError(await readErrorMessage(response), response.status);
  }
  if (!response.body) {
    throw new InteractionError("Gemini returned an empty response stream.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let text = "";
  let interactionId = "";

  const consumeBlock = (block) => {
    const data = parseEventData(block);
    if (!data || data === "[DONE]") return;

    let event;
    try {
      event = JSON.parse(data);
    } catch {
      return;
    }

    interactionId = event.interaction?.id
      || event.interaction_id
      || interactionId;

    if (event.event_type === "step.delta" && event.delta?.type === "text") {
      const chunk = event.delta.text || "";
      text += chunk;
      onChunk?.(chunk);
    }

    if (event.error) {
      throw new InteractionError(event.error.message || "Gemini could not complete the response.");
    }
  };

  while (true) {
    const { done, value } = await reader.read();
    buffer += decoder.decode(value, { stream: !done });
    const blocks = buffer.split(/\r?\n\r?\n/);
    buffer = blocks.pop() ?? "";
    blocks.forEach(consumeBlock);
    if (done) break;
  }

  if (buffer.trim()) consumeBlock(buffer);
  if (!interactionId) {
    throw new InteractionError("Gemini completed without returning a conversation identifier.");
  }

  return { text, interactionId };
};

async function run({
  prompt,
  history = [],
  profileContext = "",
  previousInteractionId = "",
  onChunk,
}) {
  if (!apiKey || apiKey === "YOUR_GEMINI_API_KEY_HERE") {
    throw new Error(
      "Missing Gemini API key. Add VITE_GEMINI_API_KEY to .env.local and restart the dev server."
    );
  }

  const execute = (interactionId) => streamInteraction({
    input: interactionId
      ? prompt
      : buildInitialInput({ prompt, history, profileContext }),
    previousInteractionId: interactionId,
    onChunk,
  });

  try {
    return await execute(previousInteractionId);
  } catch (error) {
    const stateExpired = previousInteractionId
      && (error?.status === 400 || error?.status === 404)
      && !/api key|permission|quota/i.test(error?.message || "");

    if (stateExpired) {
      // Rebuild an expired server-side conversation once from the locally
      // persisted transcript and continue with a fresh interaction chain.
      return execute("");
    }

    const message = `${error?.message || error}`;
    if (/api key not valid|api_key_invalid/i.test(message)) {
      throw new Error(
        "Your Gemini API key is invalid. Check VITE_GEMINI_API_KEY and ensure the Generative Language API is enabled."
      );
    }
    throw error;
  }
}

export default run;
