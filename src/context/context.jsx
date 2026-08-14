import { createContext, useEffect, useMemo, useState } from "react";
import run from "../config/gemini";

export const Context = createContext();

const STORAGE_KEY = "sydney-ai-assistant-chats-v1";
const REVEAL_INTERVAL_MS = 16;

const makeId = () => globalThis.crypto?.randomUUID?.()
  ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const makeProfileVersion = (profileContext) => {
  let hash = 2166136261;
  for (let index = 0; index < profileContext.length; index += 1) {
    hash ^= profileContext.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
};

const createTextRevealer = (onReveal) => {
  let queuedText = "";
  let revealedText = "";
  let timerId = null;
  let flushResolvers = [];

  const resolveFlushes = () => {
    const completedText = revealedText;
    flushResolvers.forEach((resolve) => resolve(completedText));
    flushResolvers = [];
  };

  const revealNext = () => {
    timerId = null;

    if (!queuedText) {
      resolveFlushes();
      return;
    }

    // Reveal one or two characters for small updates, then adaptively catch up
    // when the network delivers a larger block of text at once.
    const characterCount = Math.min(18, Math.max(1, Math.ceil(queuedText.length / 60)));
    revealedText += queuedText.slice(0, characterCount);
    queuedText = queuedText.slice(characterCount);
    onReveal(revealedText);

    if (queuedText) {
      timerId = window.setTimeout(revealNext, REVEAL_INTERVAL_MS);
    } else {
      resolveFlushes();
    }
  };

  const start = () => {
    if (timerId === null && queuedText) {
      timerId = window.setTimeout(revealNext, REVEAL_INTERVAL_MS);
    }
  };

  return {
    push(text) {
      if (!text) return;
      queuedText += text;
      start();
    },
    flush() {
      if (!queuedText && timerId === null) return Promise.resolve(revealedText);
      return new Promise((resolve) => {
        flushResolvers.push(resolve);
        start();
      });
    },
  };
};

const loadChats = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(saved) ? saved : [];
  } catch {
    return [];
  }
};

// eslint-disable-next-line react/prop-types
const ContextProvider = ({ children }) => {
  const [initialChats] = useState(loadChats);
  const [chats, setChats] = useState(initialChats);
  const [activeChatId, setActiveChatId] = useState(
    initialChats.find((chat) => !chat.archivedAt)?.id ?? null
  );
  const [pendingChatId, setPendingChatId] = useState(null);
  const [input, setInput] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [jobDescAttached, setJobDescAttached] = useState(false);
  const [jobFileName, setJobFileName] = useState("");

  useEffect(() => {
    // localStorage is synchronous; avoid serializing the full transcript for
    // every streamed token. The completed message is persisted once at the end.
    if (chats.some((chat) => chat.messages.some((message) => message.streaming))) return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
    } catch (error) {
      console.error("Unable to save chat history", error);
    }
  }, [chats]);

  const activeChat = useMemo(
    () => chats.find((chat) => chat.id === activeChatId) ?? null,
    [activeChatId, chats]
  );

  const newChat = () => {
    setActiveChatId(null);
    setInput("");
    setJobDescription("");
    setJobDescAttached(false);
    setJobFileName("");
  };

  const selectChat = (chatId) => {
    setActiveChatId(chatId);
    setInput("");
  };

  const archiveChat = (chatId) => {
    if (pendingChatId === chatId) return;

    setChats((currentChats) => currentChats.map((chat) => chat.id === chatId
      ? { ...chat, archivedAt: new Date().toISOString() }
      : chat));

    if (activeChatId === chatId) {
      const nextChat = chats.find((chat) => chat.id !== chatId && !chat.archivedAt);
      setActiveChatId(nextChat?.id ?? null);
      setInput("");
      setJobDescription("");
      setJobDescAttached(false);
      setJobFileName("");
    }
  };

  const restoreChat = (chatId) => {
    setChats((currentChats) => currentChats.map((chat) => chat.id === chatId
      ? { ...chat, archivedAt: null }
      : chat));
  };

  const onSent = async ({
    prompt,
    modelPrompt = prompt,
    profileContext = "",
    attachmentName = "",
  }) => {
    const question = prompt.trim();
    if (!question || pendingChatId) return;

    const conversationId = activeChatId ?? makeId();
    const priorMessages = activeChat?.messages ?? [];
    const profileVersion = makeProfileVersion(profileContext);
    const profileChanged = activeChat?.profileVersion !== profileVersion;
    const previousInteractionId = profileChanged
      ? ""
      : activeChat?.interactionId ?? "";
    const userMessage = {
      id: makeId(),
      role: "user",
      content: question,
      modelContent: modelPrompt,
      attachmentName,
    };
    const assistantMessage = {
      id: makeId(),
      role: "assistant",
      content: "",
      streaming: true,
    };

    setActiveChatId(conversationId);
    setPendingChatId(conversationId);
    setInput("");
    setJobDescription("");
    setJobDescAttached(false);
    setJobFileName("");
    setChats((currentChats) => {
      const existingChat = currentChats.find((chat) => chat.id === conversationId);
      if (existingChat) {
        return currentChats.map((chat) => chat.id === conversationId
          ? {
              ...chat,
              archivedAt: null,
              messages: [...chat.messages, userMessage, assistantMessage],
            }
          : chat);
      }

      return [{
        id: conversationId,
        title: question,
        createdAt: new Date().toISOString(),
        interactionId: "",
        profileVersion,
        messages: [userMessage, assistantMessage],
      }, ...currentChats];
    });

    let streamedResponse = "";
    const revealResponse = createTextRevealer((content) => {
      setChats((currentChats) => currentChats.map((chat) => chat.id === conversationId
        ? {
            ...chat,
            messages: chat.messages.map((message) => message.id === assistantMessage.id
              ? { ...message, content }
              : message),
          }
        : chat));
    });

    try {
      const response = await run({
        prompt: modelPrompt,
        history: priorMessages,
        profileContext,
        previousInteractionId,
        onChunk: (chunk) => {
          streamedResponse += chunk;
          revealResponse.push(chunk);
        },
      });

      await revealResponse.flush();

      setChats((currentChats) => currentChats.map((chat) => chat.id === conversationId
        ? {
            ...chat,
            interactionId: response.interactionId,
            profileVersion,
            messages: chat.messages.map((message) => message.id === assistantMessage.id
              ? {
                  ...message,
                  content: response.text || streamedResponse,
                  streaming: false,
                }
              : message),
          }
        : chat));
    } catch (error) {
      await revealResponse.flush();
      const errorMessage = error?.message || "Something went wrong. Please try again.";

      setChats((currentChats) => currentChats.map((chat) => chat.id === conversationId
        ? {
            ...chat,
            messages: chat.messages.map((message) => {
              if (message.id === userMessage.id) return { ...message, failed: true };
              if (message.id === assistantMessage.id) {
                return {
                  ...message,
                  content: streamedResponse
                    ? `${streamedResponse}\n\n[Response interrupted: ${errorMessage}]`
                    : errorMessage,
                  streaming: false,
                  isError: true,
                };
              }
              return message;
            }),
          }
        : chat));
    } finally {
      setPendingChatId(null);
    }
  };

  const contextValue = {
    chats,
    activeChatId,
    activeMessages: activeChat?.messages ?? [],
    pendingChatId,
    archiveChat,
    restoreChat,
    onSent,
    selectChat,
    input,
    setInput,
    newChat,
    jobDescription,
    setJobDescription,
    jobDescAttached,
    setJobDescAttached,
    jobFileName,
    setJobFileName,
  };

  return (
    <Context.Provider value={contextValue}>
      {children}
    </Context.Provider>
  );
};

export default ContextProvider;
