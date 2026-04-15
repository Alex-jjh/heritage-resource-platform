"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
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
    queryFn: () => apiClient.get<Page<CommentResponse>>(`/api/comments/${resourceId}?page=${page}&size=10`),
  });

  const addComment = useMutation({
    mutationFn: (commentBody: string) => apiClient.post<CommentResponse>(`/api/comments/${resourceId}`, { body: commentBody }),
    onSuccess: () => {
      setBody("");
      setError(null);
      setPage(0);
      queryClient.invalidateQueries({ queryKey: ["comments", resourceId] });
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Failed to post comment.");
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) { setError("Comment cannot be empty."); return; }
    addComment.mutate(body.trim());
  }

  const data = commentsQuery.data;

  return (
    <div style={{ marginTop: 20 }}>
      <h2>Comments</h2>

      <form onSubmit={handleSubmit} style={{ marginBottom: 20 }}>
        <textarea
          placeholder="Share your thoughts..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          style={{ marginBottom: 8 }}
        />
        {error && <p style={{ color: "#c00", fontSize: 13 }}>{error}</p>}
        <button type="submit" className="btn btn-primary btn-sm" disabled={addComment.isPending}>
          {addComment.isPending ? "Posting..." : "Post Comment"}
        </button>
      </form>

      {commentsQuery.isLoading ? (
        <p style={{ color: "#888" }}>Loading comments...</p>
      ) : data && data.content.length === 0 ? (
        <p style={{ color: "#888" }}>No comments yet. Be the first to share your thoughts.</p>
      ) : data ? (
        <>
          {data.content.map((comment) => (
            <div key={comment.id} className="card" style={{ marginBottom: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                <strong style={{ fontSize: 14 }}>{comment.authorName}</strong>
                <span style={{ fontSize: 12, color: "#888" }}>
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p style={{ margin: 0, fontSize: 14, whiteSpace: "pre-wrap" }}>{comment.body}</p>
            </div>
          ))}

          {data.totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: 10, marginTop: 12 }}>
              <button className="btn btn-sm" disabled={data.first} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
              <span style={{ fontSize: 13 }}>Page {data.number + 1} of {data.totalPages}</span>
              <button className="btn btn-sm" disabled={data.last} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
