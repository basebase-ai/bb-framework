import React, { useState, useMemo } from "react";
import {
  Card,
  Text,
  TextInput,
  Button,
  Group,
  Stack,
  Avatar,
  Textarea,
  ActionIcon,
  Loader,
} from "@mantine/core";
import { IconPlus, IconSend, IconMessageCircle } from "@tabler/icons-react";
import { useCollection } from "../../../../framework/hooks/useCollection.js";
import { useAuth } from "../../../../framework/hooks/useAuth.js";
import { useUserProfiles } from "../../../../framework/hooks/useUserProfiles.js";
import { showNotification } from "@mantine/notifications";
import { collections } from "../../schema.js";

function formatRelativeTime(timestamp) {
  if (!timestamp) return "";
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHour < 24) return `${diffHour}h ago`;
  if (diffDay < 7) return `${diffDay}d ago`;
  return date.toLocaleDateString();
}

export default function DiscussionTab({ app }) {
  const { user } = useAuth();
  const [newThreadTitle, setNewThreadTitle] = useState("");
  const [newThreadContent, setNewThreadContent] = useState("");
  const [replyContent, setReplyContent] = useState({});
  const [showNewThread, setShowNewThread] = useState(false);
  
  // Memoize query options to prevent re-fetching on every render
  const queryOptions = useMemo(() => ({
    where: [
      ["appId", "==", app.id],
      ["type", "==", "discussion"],
    ],
    orderBy: ["createdAt", "asc"],
  }), [app.id]);
  
  const { 
    data: allMessages = [], 
    loading,
    add: addMessage,
  } = useCollection(collections.messages, queryOptions);
  
  const authorIds = useMemo(() => {
    return [...new Set(allMessages.map(m => m.author).filter(Boolean))];
  }, [allMessages]);
  const { profiles: authorProfiles } = useUserProfiles(authorIds);
  
  // Group messages by thread
  const threads = useMemo(() => {
    const threadMap = new Map();
    
    allMessages.forEach(msg => {
      const threadId = msg.threadId || msg.id;
      if (!threadMap.has(threadId)) {
        threadMap.set(threadId, { id: threadId, starter: null, replies: [] });
      }
      
      if (!msg.threadId) {
        threadMap.get(threadId).starter = msg;
      } else {
        threadMap.get(threadId).replies.push(msg);
      }
    });
    
    return Array.from(threadMap.values())
      .filter(t => t.starter)
      .sort((a, b) => {
        const aTime = a.starter.createdAt?.toDate?.() || new Date(0);
        const bTime = b.starter.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime;
      });
  }, [allMessages]);
  
  const handleCreateThread = async () => {
    if (!newThreadTitle.trim() || !newThreadContent.trim() || !user) return;
    
    await addMessage({
      appId: app.id,
      type: "discussion",
      title: newThreadTitle.trim(),
      content: newThreadContent.trim(),
      author: user.uid,
    });
    
    setNewThreadTitle("");
    setNewThreadContent("");
    setShowNewThread(false);
    showNotification({ message: "Discussion started!", color: "teal" });
  };
  
  const handleReply = async (threadId) => {
    const content = replyContent[threadId];
    if (!content?.trim() || !user) return;
    
    await addMessage({
      appId: app.id,
      type: "discussion",
      threadId,
      content: content.trim(),
      author: user.uid,
    });
    
    setReplyContent({ ...replyContent, [threadId]: "" });
  };
  
  if (loading) {
    return <Stack align="center" py="xl"><Loader size="sm" /></Stack>;
  }
  
  return (
    <Stack gap="md">
      {!showNewThread ? (
        <Button 
          leftSection={<IconPlus size={14} />}
          variant="light"
          onClick={() => setShowNewThread(true)}
          disabled={!user}
        >
          Start Discussion
        </Button>
      ) : (
        <Card withBorder>
          <Stack gap="sm">
            <TextInput
              placeholder="Discussion title..."
              value={newThreadTitle}
              onChange={(e) => setNewThreadTitle(e.target.value)}
            />
            <Textarea
              placeholder="What would you like to discuss?"
              value={newThreadContent}
              onChange={(e) => setNewThreadContent(e.target.value)}
              minRows={3}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="subtle" onClick={() => setShowNewThread(false)}>Cancel</Button>
              <Button onClick={handleCreateThread} disabled={!newThreadTitle.trim() || !newThreadContent.trim()}>
                Post
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
      
      {threads.length === 0 ? (
        <Card withBorder>
          <Stack align="center" py="lg">
            <IconMessageCircle size={32} opacity={0.3} />
            <Text size="sm" c="dimmed">No discussions yet. Start one!</Text>
          </Stack>
        </Card>
      ) : (
        threads.map(thread => {
          const starterProfile = authorProfiles.get(thread.starter.author);
          return (
            <Card key={thread.id} withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Avatar src={starterProfile?.photoURL} size="sm" radius="xl" color="violet">
                      {(starterProfile?.displayName || "?").charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500}>{starterProfile?.displayName || "Unknown"}</Text>
                      <Text size="xs" c="dimmed">{formatRelativeTime(thread.starter.createdAt)}</Text>
                    </div>
                  </Group>
                </Group>
                
                <Text size="sm" fw={600}>{thread.starter.title}</Text>
                <Text size="sm">{thread.starter.content}</Text>
                
                {thread.replies.length > 0 && (
                  <Stack gap="xs" pl="md" style={{ borderLeft: "2px solid var(--mantine-color-violet-3)" }}>
                    {thread.replies.map(reply => {
                      const replyProfile = authorProfiles.get(reply.author);
                      return (
                        <Group key={reply.id} gap="xs" align="flex-start">
                          <Avatar src={replyProfile?.photoURL} size="xs" radius="xl" color="violet">
                            {(replyProfile?.displayName || "?").charAt(0).toUpperCase()}
                          </Avatar>
                          <div style={{ flex: 1 }}>
                            <Group gap="xs">
                              <Text size="xs" fw={500}>{replyProfile?.displayName || "Unknown"}</Text>
                              <Text size="xs" c="dimmed">{formatRelativeTime(reply.createdAt)}</Text>
                            </Group>
                            <Text size="sm">{reply.content}</Text>
                          </div>
                        </Group>
                      );
                    })}
                  </Stack>
                )}
                
                {user && (
                  <Group gap="xs">
                    <TextInput
                      placeholder="Reply..."
                      value={replyContent[thread.id] || ""}
                      onChange={(e) => setReplyContent({ ...replyContent, [thread.id]: e.target.value })}
                      style={{ flex: 1 }}
                      size="xs"
                    />
                    <ActionIcon 
                      variant="filled" 
                      color="violet"
                      size="sm"
                      onClick={() => handleReply(thread.id)}
                      disabled={!replyContent[thread.id]?.trim()}
                    >
                      <IconSend size={12} />
                    </ActionIcon>
                  </Group>
                )}
              </Stack>
            </Card>
          );
        })
      )}
    </Stack>
  );
}

