import { useCallback, useEffect, useRef, useState } from "react";
import { MessageCircle, Users } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { io } from "socket.io-client";
import AppLayout from "../../components/layout/AppLayout";
import Button from "../../components/common/Button";
import Card from "../../components/common/Card";
import { auth } from "../../config/firebase-config";
import { useAuth } from "../../hooks/useAuth";
import {
  getTeam,
  listTeamMessages,
} from "../../services/matchingApi";

const PAGE_SIZE = 50;

const getSocketUrl = () => {
  const configuredUrl = import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL;
  if (configuredUrl) return configuredUrl.replace(/\/api\/?$/, "");
  return "http://localhost:5000";
};

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
  const merged = new Map(
    currentMessages.map((message) => [message.id, message]),
  );
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
  const [realtimeError, setRealtimeError] = useState("");
  const socketRef = useRef(null);
  const joinedTeamRef = useRef(false);
  const connectedBeforeRef = useRef(false);

  const loadMessages = useCallback(async (page = 1) => {
    const messageResponse = await listTeamMessages(teamId, page, PAGE_SIZE);
    setMessages((messageResponse?.messages || []).map(normalizeMessage));
    setPagination(messageResponse?.pagination || null);
  }, [teamId]);

  const loadChat = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const teamResponse = await getTeam(teamId);
      setTeam(teamResponse?.team || teamResponse);
      await loadMessages(1);
    } catch (requestError) {
      setError(
        requestError?.message ||
          "Unable to load this team chat. You may not have access to this team.",
      );
    } finally {
      setLoading(false);
    }
  }, [loadMessages, teamId]);

  useEffect(() => {
    const loadTask = window.setTimeout(() => {
      void loadChat();
    }, 0);

    return () => window.clearTimeout(loadTask);
  }, [loadChat]);

  useEffect(() => {
    let active = true;
    let socket;

    const connectRealtime = async () => {
      const firebaseUser = auth.currentUser;
      if (!firebaseUser) return;

      try {
        const token = await firebaseUser.getIdToken();
        if (!active) return;

        socket = io(getSocketUrl(), {
          auth: { token },
          transports: ["websocket", "polling"],
        });
        socketRef.current = socket;

        socket.on("connect", () => {
          socket.emit("team:join", { teamId }, async (response) => {
            if (!response?.ok) {
              joinedTeamRef.current = false;
              setRealtimeError(response?.message || "Unable to join realtime team chat.");
              return;
            }

            joinedTeamRef.current = true;
            setRealtimeError("");
            if (connectedBeforeRef.current) {
              try {
                await loadMessages(1);
              } catch (requestError) {
                setRealtimeError(requestError?.message || "Unable to recover recent messages.");
              }
            }
            connectedBeforeRef.current = true;
          });
        });

        socket.on("team:message", (message) => {
          setMessages((currentMessages) => mergeMessages(currentMessages, [
            normalizeMessage(message),
          ]));
        });

        socket.on("disconnect", () => {
          joinedTeamRef.current = false;
          setRealtimeError("Realtime connection lost. Reconnecting...");
        });

        socket.on("connect_error", (connectionError) => {
          joinedTeamRef.current = false;
          setRealtimeError(connectionError?.message || "Realtime chat is unavailable.");
        });
      } catch (connectionError) {
        setRealtimeError(connectionError?.message || "Realtime chat is unavailable.");
      }
    };

    void connectRealtime();
    return () => {
      active = false;
      joinedTeamRef.current = false;
      socketRef.current = null;
      socket?.disconnect();
    };
  }, [loadMessages, teamId]);

  useEffect(() => {
    const recoveryTimer = window.setInterval(() => {
      if (document.visibilityState === "hidden") return;
      void loadMessages(1).catch(() => {});
    }, 5000);

    return () => window.clearInterval(recoveryTimer);
  }, [loadMessages]);

  const loadOlderMessages = async () => {
    if (
      !pagination ||
      pagination.page >= pagination.totalPages ||
      loadingOlder
    ) {
      return;
    }

    setLoadingOlder(true);
    setSendError("");
    try {
      const nextPage = pagination.page + 1;
      const response = await listTeamMessages(teamId, nextPage, PAGE_SIZE);
      const olderMessages = (response?.messages || []).map(normalizeMessage);
      setMessages((currentMessages) =>
        mergeMessages(currentMessages, olderMessages),
      );
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
      const socket = socketRef.current;
      if (!socket?.connected || !joinedTeamRef.current) {
        throw new Error("Realtime chat is not connected. Please wait and try again.");
      }

      const clientMessageId = globalThis.crypto?.randomUUID?.()
        || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const response = await new Promise((resolve, reject) => {
        socket.timeout(10000).emit(
          "team:message",
          { teamId, content: trimmedContent, clientMessageId },
          (timeoutError, acknowledgement) => {
            if (timeoutError) {
              reject(new Error("Message delivery timed out. Please try again."));
              return;
            }
            if (!acknowledgement?.ok) {
              reject(new Error(acknowledgement?.message || "Unable to send your message."));
              return;
            }
            resolve(acknowledgement);
          },
        );
      });
      if (!response?.message) {
        throw new Error("The server did not return the saved message.");
      }
      setMessages((currentMessages) =>
        mergeMessages(currentMessages, [normalizeMessage(response.message)]),
      );
      setPagination((currentPagination) =>
        currentPagination
          ? {
              ...currentPagination,
              total: currentPagination.total + 1,
              totalPages: Math.ceil(
                (currentPagination.total + 1) / currentPagination.limit,
              ),
            }
          : currentPagination,
      );
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
  const teamsPath =
    profileType === "founder" ? "/app/founder-team" : "/app/team";

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
            <div className="chat-roster"><div><span className="eyebrow">Team conversation</span><strong>{team?.members?.length ? `${team.members.length + 1} people` : "Your team"}</strong></div><div className="avatar-stack" aria-label="Team members"><span className="chat-avatar"><Users size={14} /></span>{(team?.members || []).slice(0, 4).map((member, index) => <span className="chat-avatar" key={member?._id || member?.userId?._id || index}>{(member?.userId?.name || "M").slice(0, 1).toUpperCase()}</span>)}</div></div>
            {pagination && pagination.page < pagination.totalPages && (
              <Button
                className="chat-older-button"
                variant="secondary"
                onClick={loadOlderMessages}
                disabled={loadingOlder}
              >
                {loadingOlder
                  ? "Loading older messages..."
                  : "Load older messages"}
              </Button>
            )}

            <div className="chat-history" aria-live="polite">
              {messages.length === 0 ? (
                <div className="chat-empty-state"><span><MessageCircle size={21} /></span><strong>Say hi to your team</strong><p>Start the conversation and keep everyone aligned.</p></div>
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

            {realtimeError && (
              <p className="chat-realtime-status" role="status">
                {realtimeError}
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
