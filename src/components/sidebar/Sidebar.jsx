/* eslint-disable react/prop-types */
import { useContext, useMemo, useState } from "react";
import "./sidebar.css";
import { assets } from "../../assets/assets";
import { Context } from "../../context/context";

const ArchiveIcon = ({ restore = false }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M4 7.5h16v12H4z" />
    <path d="M3 4.5h18v3H3zM9 11h6" />
    {restore ? <path d="m9 15 3-3 3 3M12 12v5" /> : null}
  </svg>
);

const ChatEntry = ({ chat, active, pending, archived, onSelect, onAction }) => (
  <div className={`chat-entry${active ? " active" : ""}`}>
    <button className="chat-select" type="button" onClick={onSelect}>
      <img src={assets.message_icon} alt="" />
      <span>{chat.title.slice(0, 29)}{chat.title.length > 29 ? "…" : ""}</span>
    </button>
    <button
      className="chat-action"
      type="button"
      onClick={onAction}
      disabled={pending}
      aria-label={`${archived ? "Restore" : "Archive"} ${chat.title}`}
      title={pending
        ? "Wait for this response to finish"
        : `${archived ? "Restore" : "Archive"} chat`}
    >
      <ArchiveIcon restore={archived} />
    </button>
  </div>
);

export const Sidebar = () => {
  const [extended, setExtended] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const {
    chats,
    activeChatId,
    pendingChatId,
    selectChat,
    newChat,
    archiveChat,
    restoreChat,
  } = useContext(Context);

  const recentChats = useMemo(
    () => chats.filter((chat) => !chat.archivedAt),
    [chats]
  );
  const archivedChats = useMemo(
    () => chats.filter((chat) => chat.archivedAt),
    [chats]
  );

  return (
    <aside className={`sidebar${extended ? " extended" : ""}`}>
      <div className="sidebar-top">
        <button
          type="button"
          onClick={() => setExtended((current) => !current)}
          className="menu-button"
          aria-label={extended ? "Close chat menu" : "Open chat menu"}
          aria-expanded={extended}
        >
          <img src={assets.menu_icon} alt="" />
        </button>

        <button type="button" onClick={newChat} className="new-chat" aria-label="New chat">
          <img src={assets.plus_icon} alt="" />
          {extended ? <span>New chat</span> : null}
        </button>

        {extended ? (
          <div className="chat-library">
            <section className="chat-section" aria-labelledby="recent-chats-heading">
              <div className="section-heading">
                <p id="recent-chats-heading">Recent</p>
                <span>{recentChats.length}</span>
              </div>
              <div className="chat-list">
                {recentChats.length ? recentChats.map((chat) => (
                  <ChatEntry
                    key={chat.id}
                    chat={chat}
                    active={chat.id === activeChatId}
                    pending={chat.id === pendingChatId}
                    onSelect={() => selectChat(chat.id)}
                    onAction={() => archiveChat(chat.id)}
                  />
                )) : (
                  <div className="empty-state">
                    <p>No recent chats</p>
                    <span>Start a new conversation above.</span>
                  </div>
                )}
              </div>
            </section>

            <section className="chat-section archived-section" aria-labelledby="archived-chats-heading">
              <button
                id="archived-chats-heading"
                className="archive-toggle"
                type="button"
                onClick={() => setShowArchived((current) => !current)}
                aria-expanded={showArchived}
              >
                <span className="archive-label">
                  <ArchiveIcon />
                  Archived
                </span>
                <span className="archive-meta">
                  <span className="archive-count">{archivedChats.length}</span>
                  <span className={`chevron${showArchived ? " open" : ""}`}>⌄</span>
                </span>
              </button>

              {showArchived ? (
                <div className="chat-list archived-list">
                  {archivedChats.length ? archivedChats.map((chat) => (
                    <ChatEntry
                      key={chat.id}
                      chat={chat}
                      active={chat.id === activeChatId}
                      pending={chat.id === pendingChatId}
                      archived
                      onSelect={() => selectChat(chat.id)}
                      onAction={() => restoreChat(chat.id)}
                    />
                  )) : (
                    <div className="empty-state compact">
                      <p>Nothing archived</p>
                    </div>
                  )}
                </div>
              ) : null}
            </section>
          </div>
        ) : null}
      </div>
    </aside>
  );
};
