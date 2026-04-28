"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentResponse, Page } from "@/types";

interface CommentSectionProps {
  resourceId: string;
}

export function CommentSection({ resourceId }: CommentSectionProps) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const commentsQuery = useQuery({
    queryKey: ["comments", resourceId, page],
    queryFn: () =>
      apiClient.get<Page<CommentResponse>>(
        `/api/comments/${resourceId}?page=${page}&size=10`
      ),
  });

  const addComment = useMutation({
    mutationFn: (commentBody: string) =>
      apiClient.post<CommentResponse>(`/api/comments/${resourceId}`, {
        body: commentBody,
      }),
    onSuccess: () => {
      setBody("");
      setError(null);
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ["comments", resourceId] });
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError("Failed to post comment.");
      }
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) {
      setError("Comment cannot be empty.");
      return;
    }
    addComment.mutate(body.trim());
  }

  const data = commentsQuery.data;

  return (
    <section aria-labelledby="comments-heading" className="space-y-6">
      <h2 id="comments-heading" className="text-xl font-semibold">Comments</h2>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label htmlFor="comment-input" className="sr-only">Add a comment</label>
        <Textarea
          id="comment-input"
          placeholder="Share your thoughts…"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />
        {error && (
          <p role="alert" className="text-sm text-destructive">{error}</p>
        )}
        <Button type="submit" disabled={addComment.isPending}>
          {addComment.isPending ? "Posting…" : "Post Comment"}
        </Button>
      </form>

      {commentsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments…</p>
      ) : data && data.content.length === 0 ? (
        <p className="text-sm text-muted-foreground">No comments yet. Be the first to share your thoughts.</p>
      ) : data ? (
        <>
          <ul className="space-y-4">
            {data.content.map((comment) => (
              <li key={comment.id} className="rounded-md border p-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{comment.authorName}</span>
                  <time className="text-xs text-muted-foreground" dateTime={comment.createdAt}>
                    {new Date(comment.createdAt).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </time>
                </div>
                <p className="mt-2 text-sm whitespace-pre-wrap">{comment.body}</p>
              </li>
            ))}
          </ul>

          {data.totalPages > 1 && (
            <nav aria-label="Comments pagination" className="flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={data.first}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
                Page {data.number + 1} of {data.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={data.last}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </nav>
          )}
        </>
      ) : null}
    </section>
  );
}
