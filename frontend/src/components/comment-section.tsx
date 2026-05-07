"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient, ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { CommentResponse, Page } from "@/types";

interface CommentSectionProps {
  resourceId: string;
  initialPage?: number;
  highlightCommentId?: string;
}

const PAGE_SIZE = 10;

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function CommentAvatar({
  authorName,
  avatarUrl,
  anonymous,
}: {
  authorName: string;
  avatarUrl?: string | null;
  anonymous: boolean;
}) {
  const displayName = anonymous ? "Anonymous" : authorName;
  const initials = anonymous ? "A" : getInitials(displayName) || "?";

  if (avatarUrl && !anonymous) {
    return (
      <img
        src={avatarUrl}
        alt={displayName}
        className="h-10 w-10 shrink-0 rounded-full border border-border object-cover"
      />
    );
  }

  return (
    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-secondary/60 font-serif text-sm font-semibold text-foreground">
      {initials}
    </div>
  );
}

function formatCommentDate(dateString: string) {
  return new Date(dateString).toLocaleString("en-GB", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

export function CommentSection({
  resourceId,
  initialPage = 0,
  highlightCommentId,
}: CommentSectionProps) {
  const queryClient = useQueryClient();

  const [body, setBody] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [page, setPage] = useState(initialPage);
  const [error, setError] = useState<string | null>(null);
  const [highlightedCommentId, setHighlightedCommentId] = useState<
    string | null
  >(null);

  const commentRefs = useRef<Record<string, HTMLLIElement | null>>({});
  const hasScrolledToHighlight = useRef(false);

  useEffect(() => {
    hasScrolledToHighlight.current = false;
    const timeout = window.setTimeout(() => {
      setPage(initialPage);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, [initialPage, highlightCommentId, resourceId]);

  const commentsQuery = useQuery({
    queryKey: ["comments", resourceId, page],
    queryFn: () =>
      apiClient.get<Page<CommentResponse>>(
        `/api/comments/${resourceId}?page=${page}&size=${PAGE_SIZE}`
      ),
  });

  const addComment = useMutation({
    mutationFn: (payload: { body: string; anonymous: boolean }) =>
      apiClient.post<CommentResponse>(`/api/comments/${resourceId}`, payload),
    onSuccess: () => {
      setBody("");
      setAnonymous(false);
      setError(null);
      setPage(0);
      hasScrolledToHighlight.current = false;
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

  useEffect(() => {
    if (!highlightCommentId || !commentsQuery.data || hasScrolledToHighlight.current) {
      return;
    }

    const targetExistsOnCurrentPage = commentsQuery.data.content.some(
      (comment) => comment.id === highlightCommentId
    );

    if (!targetExistsOnCurrentPage) {
      return;
    }

    const el = commentRefs.current[highlightCommentId];
    if (!el) {
      return;
    }

    hasScrolledToHighlight.current = true;

    const frame = requestAnimationFrame(() => {
      setHighlightedCommentId(highlightCommentId);
      el.scrollIntoView({
        behavior: "smooth",
        block: "center",
      });
    });

    const timeout = window.setTimeout(() => {
      setHighlightedCommentId((current) =>
        current === highlightCommentId ? null : current
      );
    }, 3000);

    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(timeout);
    };
  }, [commentsQuery.data, highlightCommentId]);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!body.trim()) {
      setError("Comment cannot be empty.");
      return;
    }

    addComment.mutate({
      body: body.trim(),
      anonymous,
    });
  }

  const data = commentsQuery.data;

  return (
    <section
      aria-labelledby="comments-heading"
      className="mt-20 space-y-6 border-t border-border pt-12"
    >
      <h2 id="comments-heading" className="font-serif text-[1.6rem] font-medium">
        Comments
      </h2>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl border border-border bg-white p-5 shadow-[var(--shadow-heritage-card)]"
      >
        <label htmlFor="comment-input" className="sr-only">
          Add a comment
        </label>

        <Textarea
          id="comment-input"
          placeholder="Share your thoughts..."
          value={body}
          onChange={(e) => setBody(e.target.value)}
          rows={3}
        />

        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          <input
            type="checkbox"
            checked={anonymous}
            onChange={(e) => setAnonymous(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Post anonymously
        </label>

        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}

        <Button type="submit" disabled={addComment.isPending}>
          {addComment.isPending ? "Posting..." : "Post Comment"}
        </Button>
      </form>

      {commentsQuery.isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : commentsQuery.isError ? (
        <p role="alert" className="text-sm text-destructive">
          Failed to load comments.
        </p>
      ) : data && data.content.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No comments yet. Be the first to share your thoughts.
        </p>
      ) : data ? (
        <>
          <ul className="space-y-4">
            {data.content.map((comment) => {
              const canOpenProfile =
                !comment.anonymous &&
                comment.profileClickable &&
                Boolean(comment.authorId);

              const isHighlighted = highlightedCommentId === comment.id;

              const avatar = (
                <CommentAvatar
                  authorName={comment.authorName}
                  avatarUrl={comment.avatarUrl}
                  anonymous={comment.anonymous}
                />
              );

              const authorLabel = comment.anonymous ? (
                <span className="text-sm italic text-muted-foreground">
                  Anonymous
                </span>
              ) : (
                <span className="text-sm font-medium">{comment.authorName}</span>
              );

              return (
                <li
                  key={comment.id}
                  ref={(el) => {
                    commentRefs.current[comment.id] = el;
                  }}
                  className={`rounded-2xl border border-border bg-white p-4 transition-all duration-500 ${
                    isHighlighted ? "bg-amber-50/40 shadow-md ring-2 ring-amber-200" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {canOpenProfile ? (
                      <Link
                        href={`/users/${comment.authorId}`}
                        className="shrink-0 rounded-full transition hover:opacity-90 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                        aria-label={`Open ${comment.authorName}'s profile`}
                      >
                        {avatar}
                      </Link>
                    ) : (
                      avatar
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        {canOpenProfile ? (
                          <Link
                            href={`/users/${comment.authorId}`}
                            className="text-sm font-medium hover:text-accent"
                          >
                            {comment.authorName}
                          </Link>
                        ) : (
                          authorLabel
                        )}

                        <time
                          className="text-xs text-muted-foreground"
                          dateTime={comment.createdAt}
                        >
                          {formatCommentDate(comment.createdAt)}
                        </time>
                      </div>

                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-foreground/80">
                        {comment.body}
                      </p>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>

          {data.totalPages > 1 && (
            <nav
              aria-label="Comments pagination"
              className="flex items-center justify-center gap-2"
            >
              <Button
                variant="outline"
                size="sm"
                disabled={data.first}
                onClick={() => {
                  hasScrolledToHighlight.current = false;
                  setPage((p) => Math.max(0, p - 1));
                }}
              >
                Previous
              </Button>

              <span className="text-sm text-muted-foreground">
                Page {data.number + 1} of {Math.max(data.totalPages, 1)}
              </span>

              <Button
                variant="outline"
                size="sm"
                disabled={data.last}
                onClick={() => {
                  hasScrolledToHighlight.current = false;
                  setPage((p) => p + 1);
                }}
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
