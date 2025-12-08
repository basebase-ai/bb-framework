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
  Rating,
  Loader,
} from "@mantine/core";
import { IconStar } from "@tabler/icons-react";
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

export default function ReviewsTab({ app }) {
  const { user } = useAuth();
  const [showNewReview, setShowNewReview] = useState(false);
  const [newReview, setNewReview] = useState({ rating: 5, title: "", content: "" });
  
  // Simple query - filter by appId only, sort in memory to avoid composite index
  const queryOptions = useMemo(() => ({
    where: [["appId", "==", app.id]],
  }), [app.id]);
  
  const { 
    data: rawReviews = [], 
    loading,
    add: addReview,
  } = useCollection(collections.reviews, queryOptions);
  
  // Sort in memory
  const reviews = useMemo(() => {
    return [...rawReviews].sort((a, b) => {
      const aTime = a.createdAt?.toDate?.() || new Date(0);
      const bTime = b.createdAt?.toDate?.() || new Date(0);
      return bTime - aTime; // desc
    });
  }, [rawReviews]);
  
  const authorIds = useMemo(() => {
    return [...new Set(reviews.map(r => r.author).filter(Boolean))];
  }, [reviews]);
  const { profiles: authorProfiles } = useUserProfiles(authorIds);
  
  const userReview = useMemo(() => {
    if (!user) return null;
    return reviews.find(r => r.author === user.uid);
  }, [reviews, user]);
  
  const avgRating = useMemo(() => {
    if (reviews.length === 0) return 0;
    return reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length;
  }, [reviews]);
  
  const handleSubmitReview = async () => {
    if (!user || newReview.rating < 1) return;
    
    await addReview({
      appId: app.id,
      author: user.uid,
      rating: newReview.rating,
      title: newReview.title.trim(),
      content: newReview.content.trim(),
    });
    
    setNewReview({ rating: 5, title: "", content: "" });
    setShowNewReview(false);
    showNotification({ message: "Review submitted!", color: "teal" });
  };
  
  if (loading) {
    return <Stack align="center" py="xl"><Loader size="sm" /></Stack>;
  }
  
  return (
    <Stack gap="md">
      <Card withBorder>
        <Group justify="space-between">
          <div>
            <Group gap="xs">
              <Text size="xl" fw={700}>{avgRating.toFixed(1)}</Text>
              <Rating value={avgRating} fractions={2} readOnly size="sm" />
            </Group>
            <Text size="xs" c="dimmed">{reviews.length} review{reviews.length !== 1 ? "s" : ""}</Text>
          </div>
          {user && !userReview && !showNewReview && (
            <Button 
              leftSection={<IconStar size={14} />}
              variant="light"
              onClick={() => setShowNewReview(true)}
            >
              Write Review
            </Button>
          )}
        </Group>
      </Card>
      
      {showNewReview && (
        <Card withBorder>
          <Stack gap="sm">
            <div>
              <Text size="sm" fw={500} mb="xs">Your Rating</Text>
              <Rating 
                value={newReview.rating} 
                onChange={(val) => setNewReview({ ...newReview, rating: val })}
              />
            </div>
            <TextInput
              placeholder="Review title (optional)"
              value={newReview.title}
              onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
            />
            <Textarea
              placeholder="Share your experience..."
              value={newReview.content}
              onChange={(e) => setNewReview({ ...newReview, content: e.target.value })}
              minRows={3}
            />
            <Group justify="flex-end" gap="xs">
              <Button variant="subtle" onClick={() => setShowNewReview(false)}>Cancel</Button>
              <Button onClick={handleSubmitReview}>Submit Review</Button>
            </Group>
          </Stack>
        </Card>
      )}
      
      {reviews.length === 0 ? (
        <Card withBorder>
          <Stack align="center" py="lg">
            <IconStar size={32} opacity={0.3} />
            <Text size="sm" c="dimmed">No reviews yet. Be the first!</Text>
          </Stack>
        </Card>
      ) : (
        reviews.map(review => {
          const reviewProfile = authorProfiles.get(review.author);
          return (
            <Card key={review.id} withBorder>
              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="xs">
                    <Avatar src={reviewProfile?.photoURL} size="sm" radius="xl" color="violet">
                      {(reviewProfile?.displayName || "?").charAt(0).toUpperCase()}
                    </Avatar>
                    <div>
                      <Text size="sm" fw={500}>{reviewProfile?.displayName || "Unknown"}</Text>
                      <Text size="xs" c="dimmed">{formatRelativeTime(review.createdAt)}</Text>
                    </div>
                  </Group>
                  <Rating value={review.rating} readOnly size="xs" />
                </Group>
                {review.title && <Text size="sm" fw={500}>{review.title}</Text>}
                {review.content && <Text size="sm">{review.content}</Text>}
              </Stack>
            </Card>
          );
        })
      )}
    </Stack>
  );
}

