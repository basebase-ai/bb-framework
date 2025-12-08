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
  Badge,
  ThemeIcon,
  Select,
  Loader,
} from "@mantine/core";
import {
  IconPlus,
  IconArrowLeft,
  IconBug,
  IconStar,
  IconMessageCircle,
  IconCircleDot,
} from "@tabler/icons-react";
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

const priorityColors = { low: "gray", medium: "yellow", high: "orange", critical: "red" };
const statusColors = { open: "blue", in_progress: "yellow", resolved: "teal", closed: "gray" };
const typeIcons = { bug: IconBug, feature: IconStar, question: IconMessageCircle, other: IconCircleDot };

export default function IssuesTab({ app }) {
  const { user } = useAuth();
  const [showNewIssue, setShowNewIssue] = useState(false);
  const [newIssue, setNewIssue] = useState({ title: "", content: "", issueType: "bug", priority: "medium" });
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [commentContent, setCommentContent] = useState("");
  
  // Simple query - filter by appId only, then filter/sort in memory to avoid composite index
  const queryOptions = useMemo(() => ({
    where: [["appId", "==", app.id]],
  }), [app.id]);
  
  const { 
    data: rawMessages = [], 
    loading,
    add: addMessage,
    update: updateMessage,
  } = useCollection(collections.messages, queryOptions);
  
  // Filter to issues and sort in memory
  const allMessages = useMemo(() => {
    return rawMessages
      .filter(m => m.type === "issue")
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return bTime - aTime; // desc
      });
  }, [rawMessages]);
  
  const { issues, comments } = useMemo(() => {
    const issueList = allMessages.filter(m => !m.issueId);
    const commentList = allMessages.filter(m => m.issueId);
    return { issues: issueList, comments: commentList };
  }, [allMessages]);
  
  const authorIds = useMemo(() => {
    return [...new Set(allMessages.map(m => m.author).filter(Boolean))];
  }, [allMessages]);
  const { profiles: authorProfiles } = useUserProfiles(authorIds);
  
  const handleCreateIssue = async () => {
    if (!newIssue.title.trim() || !user) return;
    
    await addMessage({
      appId: app.id,
      type: "issue",
      title: newIssue.title.trim(),
      content: newIssue.content.trim(),
      issueType: newIssue.issueType,
      priority: newIssue.priority,
      status: "open",
      author: user.uid,
    });
    
    setNewIssue({ title: "", content: "", issueType: "bug", priority: "medium" });
    setShowNewIssue(false);
    showNotification({ message: "Issue created!", color: "teal" });
  };
  
  const handleAddComment = async () => {
    if (!commentContent.trim() || !selectedIssue || !user) return;
    
    await addMessage({
      appId: app.id,
      type: "issue",
      issueId: selectedIssue.id,
      content: commentContent.trim(),
      author: user.uid,
    });
    
    setCommentContent("");
  };
  
  const handleUpdateStatus = async (issueId, status) => {
    await updateMessage(issueId, { status });
    setSelectedIssue(prev => prev ? { ...prev, status } : null);
    showNotification({ message: `Issue ${status}`, color: "teal" });
  };
  
  const issueComments = useMemo(() => {
    if (!selectedIssue) return [];
    return comments.filter(c => c.issueId === selectedIssue.id)
      .sort((a, b) => {
        const aTime = a.createdAt?.toDate?.() || new Date(0);
        const bTime = b.createdAt?.toDate?.() || new Date(0);
        return aTime - bTime;
      });
  }, [selectedIssue, comments]);
  
  if (loading) {
    return <Stack align="center" py="xl"><Loader size="sm" /></Stack>;
  }
  
  // Issue Detail View
  if (selectedIssue) {
    const issueProfile = authorProfiles.get(selectedIssue.author);
    const TypeIcon = typeIcons[selectedIssue.issueType] || IconCircleDot;
    
    return (
      <Stack gap="md">
        <Button 
          variant="subtle" 
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => setSelectedIssue(null)}
          style={{ alignSelf: "flex-start" }}
        >
          Back to Issues
        </Button>
        
        <Card withBorder>
          <Stack gap="sm">
            <Group justify="space-between">
              <Group gap="xs">
                <ThemeIcon size="sm" variant="light" color={selectedIssue.issueType === "bug" ? "red" : "violet"}>
                  <TypeIcon size={12} />
                </ThemeIcon>
                <Text size="lg" fw={600}>{selectedIssue.title}</Text>
              </Group>
              <Group gap="xs">
                <Badge color={priorityColors[selectedIssue.priority]} size="sm">{selectedIssue.priority}</Badge>
                <Badge color={statusColors[selectedIssue.status]} size="sm">{selectedIssue.status?.replace("_", " ")}</Badge>
              </Group>
            </Group>
            
            <Group gap="xs">
              <Avatar src={issueProfile?.photoURL} size="xs" radius="xl" color="violet">
                {(issueProfile?.displayName || "?").charAt(0).toUpperCase()}
              </Avatar>
              <Text size="xs">{issueProfile?.displayName || "Unknown"}</Text>
              <Text size="xs" c="dimmed">opened {formatRelativeTime(selectedIssue.createdAt)}</Text>
            </Group>
            
            {selectedIssue.content && <Text size="sm">{selectedIssue.content}</Text>}
            
            {user && (app.owner === user.uid || app.collaborators?.includes(user.uid)) && (
              <Select
                size="xs"
                value={selectedIssue.status}
                onChange={(val) => handleUpdateStatus(selectedIssue.id, val)}
                data={[
                  { value: "open", label: "Open" },
                  { value: "in_progress", label: "In Progress" },
                  { value: "resolved", label: "Resolved" },
                  { value: "closed", label: "Closed" },
                ]}
                style={{ width: 140 }}
              />
            )}
          </Stack>
        </Card>
        
        <Text size="sm" fw={500}>Comments ({issueComments.length})</Text>
        
        {issueComments.map(comment => {
          const commentProfile = authorProfiles.get(comment.author);
          return (
            <Card key={comment.id} withBorder>
              <Group gap="xs" align="flex-start">
                <Avatar src={commentProfile?.photoURL} size="sm" radius="xl" color="violet">
                  {(commentProfile?.displayName || "?").charAt(0).toUpperCase()}
                </Avatar>
                <div style={{ flex: 1 }}>
                  <Group gap="xs">
                    <Text size="sm" fw={500}>{commentProfile?.displayName || "Unknown"}</Text>
                    <Text size="xs" c="dimmed">{formatRelativeTime(comment.createdAt)}</Text>
                  </Group>
                  <Text size="sm">{comment.content}</Text>
                </div>
              </Group>
            </Card>
          );
        })}
        
        {user && (
          <Card withBorder>
            <Stack gap="xs">
              <Textarea
                placeholder="Add a comment..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                minRows={2}
              />
              <Group justify="flex-end">
                <Button size="xs" onClick={handleAddComment} disabled={!commentContent.trim()}>
                  Comment
                </Button>
              </Group>
            </Stack>
          </Card>
        )}
      </Stack>
    );
  }
  
  // Issues List View
  return (
    <Stack gap="md">
      {!showNewIssue ? (
        <Button 
          leftSection={<IconPlus size={14} />}
          variant="light"
          onClick={() => setShowNewIssue(true)}
          disabled={!user}
        >
          New Issue
        </Button>
      ) : (
        <Card withBorder>
          <Stack gap="sm">
            <TextInput
              placeholder="Issue title..."
              value={newIssue.title}
              onChange={(e) => setNewIssue({ ...newIssue, title: e.target.value })}
            />
            <Group grow>
              <Select
                label="Type"
                size="xs"
                value={newIssue.issueType}
                onChange={(val) => setNewIssue({ ...newIssue, issueType: val })}
                data={[
                  { value: "bug", label: "🐛 Bug" },
                  { value: "feature", label: "✨ Feature" },
                  { value: "question", label: "❓ Question" },
                  { value: "other", label: "📝 Other" },
                ]}
              />
              <Select
                label="Priority"
                size="xs"
                value={newIssue.priority}
                onChange={(val) => setNewIssue({ ...newIssue, priority: val })}
                data={[
                  { value: "low", label: "Low" },
                  { value: "medium", label: "Medium" },
                  { value: "high", label: "High" },
                  { value: "critical", label: "Critical" },
                ]}
              />
            </Group>
            <Textarea
              placeholder="Describe the issue..."
              value={newIssue.content}
              onChange={(e) => setNewIssue({ ...newIssue, content: e.target.value })}
              minRows={3}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="subtle" onClick={() => setShowNewIssue(false)}>Cancel</Button>
              <Button onClick={handleCreateIssue} disabled={!newIssue.title.trim()}>
                Create Issue
              </Button>
            </Group>
          </Stack>
        </Card>
      )}
      
      {issues.length === 0 ? (
        <Card withBorder>
          <Stack align="center" py="lg">
            <IconBug size={32} opacity={0.3} />
            <Text size="sm" c="dimmed">No issues yet. Report one!</Text>
          </Stack>
        </Card>
      ) : (
        issues.map(issue => {
          const issueProfile = authorProfiles.get(issue.author);
          const TypeIcon = typeIcons[issue.issueType] || IconCircleDot;
          const issueCommentCount = comments.filter(c => c.issueId === issue.id).length;
          
          return (
            <Card 
              key={issue.id} 
              withBorder 
              style={{ cursor: "pointer" }}
              onClick={() => setSelectedIssue(issue)}
            >
              <Group justify="space-between">
                <Group gap="xs">
                  <ThemeIcon size="sm" variant="light" color={issue.issueType === "bug" ? "red" : "violet"}>
                    <TypeIcon size={12} />
                  </ThemeIcon>
                  <div>
                    <Text size="sm" fw={500}>{issue.title}</Text>
                    <Group gap="xs">
                      <Text size="xs" c="dimmed">#{issue.id.slice(-6)}</Text>
                      <Text size="xs" c="dimmed">by {issueProfile?.displayName || "Unknown"}</Text>
                      <Text size="xs" c="dimmed">{formatRelativeTime(issue.createdAt)}</Text>
                    </Group>
                  </div>
                </Group>
                <Group gap="xs">
                  {issueCommentCount > 0 && (
                    <Badge variant="light" color="gray" size="xs" leftSection={<IconMessageCircle size={10} />}>
                      {issueCommentCount}
                    </Badge>
                  )}
                  <Badge color={priorityColors[issue.priority]} size="xs">{issue.priority}</Badge>
                  <Badge color={statusColors[issue.status]} size="xs">{issue.status?.replace("_", " ")}</Badge>
                </Group>
              </Group>
            </Card>
          );
        })
      )}
    </Stack>
  );
}

