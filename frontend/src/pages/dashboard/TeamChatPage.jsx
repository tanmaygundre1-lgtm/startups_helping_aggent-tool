import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { useAuth } from "../../hooks/useAuth";
import {
  getTeam,
  listTeamMessages,
  sendTeamMessage,
} from "../../services/matchingApi";

const PAGE_SIZE = 50;

const normalizeMessage = (message) => ({
  ...message,
  id: String(message?._id || `${message?.createdAt}-${message?.content}`),
});

const formatTimestamp = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown time";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
};

const getSender = (message) => {
  if (message?.senderId && typeof message.senderId === "object") {
    return message.senderId;
  }
  return {};
};

const mergeMessages = (currentMessages, nextMessages) => {
  const merged = new Map(currentMessages.map((message) => [message.id, message]));
  nextMessages.forEach((message) => merged.set(message.id, message));
  return [...merged.values()].sort(
    (first, second) => new Date(first.createdAt) - new Date(second.createdAt),
  );
};

const TeamChatPage = () => {
  const { teamId } = useParams();
  const { profile, profileType } = useAuth();
  const [team, setTeam] = useState(null);
  const [messages, setMessages] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [sendError, setSendError] = useState("");

  const loadChat = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [teamResponse, messageResponse] = await Promise.all([
        getTeam(teamId),
        listTeamMessages(teamId, 1, PAGE_SIZE),
      ]);
      setTeam(teamResponse?.team || teamResponse);
      setMessages((messageResponse?.messages || []).map(normalizeMessage));
      setPagination(messageResponse?.pagination || null);
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Unable to load this team chat. You may not have access to this team.",
      );
    } finally {
      setLoading(false);
    }
  }, [teamId]);

  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      void loadChat();
    }, 0);

    return () => window.clearTimeout(loadTask);
  }, [loadChat]);

  const loadOlderMessages = async () => {
    if (!pagination || pagination.page >= pagination.totalPages || loadingOlder) {
      return;
    }

    setLoadingOlder(true);
    setSendError("");
    try {
      const nextPage = pagination.page + 1;
      const response = await listTeamMessages(teamId, nextPage, PAGE_SIZE);
      const olderMessages = (response?.messages || []).map(normalizeMessage);
      setMessages((currentMessages) => mergeMessages(currentMessages, olderMessages));
      setPagination(response?.pagination || pagination);
    } catch (requestError) {
      setSendError(requestError?.message || "Unable to load older messages.");
    } finally {
      setLoadingOlder(false);
    }
  };

  const submitMessage = async () => {
    const trimmedContent = content.trim();
    if (!trimmedContent || sending) return;

    setSending(true);
    setSendError("");
    try {
      const response = await sendTeamMessage(teamId, trimmedContent);
      if (!response?.message) {
        throw new Error("The server did not return the saved message.");
      }
      setMessages((currentMessages) => mergeMessages(currentMessages, [
        normalizeMessage(response.message),
      ]));
      setPagination((currentPagination) => currentPagination
        ? {
            ...currentPagination,
            total: currentPagination.total + 1,
            totalPages: Math.ceil((currentPagination.total + 1) / currentPagination.limit),
          }
        : currentPagination);
      setContent("");
    } catch (requestError) {
      setSendError(requestError?.message || "Unable to send your message.");
    } finally {
      setSending(false);
    }
  };

  const handleComposerKeyDown = (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void submitMessage();
    }
  };

  const currentUserId = String(profile?._id || "");
  const teamsPath = profileType === "founder" ? "/app/founder-team" : "/app/team";

  return (
    <AppLayout>
      <div className="chat-page">
        <div className="chat-header">
          <div>
            <Link className="chat-back-link" to={teamsPath}>
              Back to teams
            </Link>
            <h1>{team?.name || "Team chat"}</h1>
            <p>Private conversation for current team members.</p>
          </div>
        </div>

        {loading && (
          <Card>
            <p className="chat-state-text">Loading team chat...</p>
          </Card>
        )}

        {!loading && error && (
          <Card>
            <h2>Unable to open this chat.</h2>
            <p>{error}</p>
            <Button onClick={loadChat}>Retry</Button>
          </Card>
        )}

        {!loading && !error && (
          <Card className="chat-card">
            {pagination && pagination.page < pagination.totalPages && (
              <Button
                className="chat-older-button"
                variant="secondary"
                onClick={loadOlderMessages}
                disabled={loadingOlder}
              >
                {loadingOlder ? "Loading older messages..." : "Load older messages"}
              </Button>
            )}

            <div className="chat-history" aria-live="polite">
              {messages.length === 0 ? (
                <p className="chat-state-text">No messages yet. Start the conversation.</p>
              ) : (
                messages.map((message) => {
                  const sender = getSender(message);
                  const senderId = String(sender._id || message.senderId || "");
                  const isCurrentUser = senderId === currentUserId;

                  return (
                    <article
                      className={`chat-message ${isCurrentUser ? "chat-message-own" : ""}`}
                      key={message.id}
                    >
                      <div className="chat-message-meta">
                        <strong>{sender.name || "Team member"}</strong>
                        <time dateTime={message.createdAt}>
                          {formatTimestamp(message.createdAt)}
                        </time>
                      </div>
                      <p>{message.content}</p>
                    </article>
                  );
                })
              )}
            </div>

            {sendError && (
              <p className="form-error" role="alert">
                {sendError}
              </p>
            )}

            <form
              className="chat-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void submitMessage();
              }}
            >
              <label htmlFor="team-chat-message">Message</label>
              <textarea
                id="team-chat-message"
                value={content}
                onChange={(event) => setContent(event.target.value)}
                onKeyDown={handleComposerKeyDown}
                placeholder="Write to your team..."
                maxLength={2000}
                rows={3}
                disabled={sending}
              />
              <div className="chat-composer-footer">
                <span>{content.length}/2000</span>
                <Button type="submit" disabled={sending || !content.trim()}>
                  {sending ? "Sending..." : "Send"}
                </Button>
              </div>
            </form>
          </Card>
        )}
      </div>
    </AppLayout>
  );
};

export default TeamChatPage;