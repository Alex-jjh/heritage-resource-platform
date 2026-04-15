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
    <div className="mt-5">
      <h2>Comments</h2>

      <form onSubmit={handleSubmit} className="mb-5">
        <textarea
          placeholder="Share your thoughts..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
          className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 mb-2"
        />
        {error && <p className="text-red-600 text-[13px]">{error}</p>}
        <button type="submit" className="bg-blue-600 text-white px-2 py-1 rounded text-xs hover:bg-blue-700 disabled:opacity-50" disabled={addComment.isPending}>
          {addComment.isPending ? "Posting..." : "Post Comment"}
        </button>
      </form>

      {commentsQuery.isLoading ? (
        <p className="text-gray-400">Loading comments...</p>
      ) : data && data.content.length === 0 ? (
        <p className="text-gray-400">No comments yet. Be the first to share your thoughts.</p>
      ) : data ? (
        <>
          {data.content.map((comment) => (
            <div key={comment.id} className="bg-white border border-gray-200 rounded p-4 mb-2">
              <div className="flex justify-between mb-1">
                <strong className="text-sm">{comment.authorName}</strong>
                <span className="text-xs text-gray-400">
                  {new Date(comment.createdAt).toLocaleDateString()}
                </span>
              </div>
              <p className="m-0 text-sm whitespace-pre-wrap">{comment.body}</p>
            </div>
          ))}

          {data.totalPages > 1 && (
            <div className="flex justify-center gap-2.5 mt-3">
              <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50" disabled={data.first} onClick={() => setPage((p) => Math.max(0, p - 1))}>Previous</button>
              <span className="text-[13px]">Page {data.number + 1} of {data.totalPages}</span>
              <button className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50 disabled:opacity-50" disabled={data.last} onClick={() => setPage((p) => p + 1)}>Next</button>
            </div>
          )}
        </>
      ) : null}
    </div>
  );
}
