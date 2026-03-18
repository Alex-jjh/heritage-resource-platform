"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { Page, ResourceResponse } from "@/types";

const FEATURED_COUNT = 8;

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const featuredQuery = useQuery({
    queryKey: ["featured-resources"],
    queryFn: () =>
      isAuthenticated
        ? apiClient.get<Page<ResourceResponse>>(
            `/api/search/resources?page=0&size=${FEATURED_COUNT}`
          )
        : apiClient.get<ResourceResponse[]>("/api/search/featured", { skipAuth: true }).then(
            (items) => ({ content: items, totalElements: items.length } as Page<ResourceResponse>)
          ),
  });

  const resources = featuredQuery.data?.content ?? [];

  return (
    <main>
      {/* Hero section */}
      <section className="relative overflow-hidden py-24 sm:py-32">
        {/* Background image */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpeg')" }}
        />
        {/* Warm dark overlay for readability */}
        <div className="absolute inset-0 bg-gradient-to-r from-stone-900/80 via-stone-900/60 to-stone-800/50" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <h1 className="font-serif text-4xl font-bold tracking-tight text-white sm:text-5xl drop-shadow-lg">
              Discover &amp; Preserve Cultural Heritage
            </h1>
            <p className="mt-4 text-lg text-stone-200/90 drop-shadow">
              A community platform for sharing images, stories, traditions,
              places, and educational materials that celebrate our shared
              cultural heritage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link href="/browse">
                  <Button
                    size="lg"
                    className="bg-amber-600 text-white hover:bg-amber-700 shadow-lg"
                  >
                    Browse Resources
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="bg-amber-600 text-white hover:bg-amber-700 shadow-lg"
                    >
                      Get Started
                    </Button>
                  </Link>
                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="border-white/40 bg-white/10 text-white hover:bg-white/20 shadow-lg backdrop-blur-sm"
                    >
                      Sign In
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Featured resources section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          <h2 className="font-serif text-2xl font-bold">
            Featured Resources
          </h2>
          {isAuthenticated && (
            <Link href="/browse">
              <Button variant="link" className="text-accent">
                View all →
              </Button>
            </Link>
          )}
        </div>

        <div className="mt-6">
          {featuredQuery.isLoading || authLoading ? (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {Array.from({ length: FEATURED_COUNT }).map((_, i) => (
                  <div key={i} className="space-y-3">
                    <Skeleton className="aspect-[4/3] w-full rounded-md" />
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </div>
                ))}
              </div>
            ) : featuredQuery.isError ? (
              <div
                role="alert"
                className="rounded-md bg-destructive/10 p-4 text-sm text-destructive"
              >
                Unable to load featured resources. Please try again later.
              </div>
            ) : resources.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-lg text-muted-foreground">
                  No approved resources yet.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Be the first to contribute heritage content.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {resources.map((resource) => (
                  <ResourceCard key={resource.id} resource={resource} />
                ))}
              </div>
            )}
          </div>

        {!isAuthenticated && resources.length > 0 && (
          <div className="mt-8 text-center">
            <Link href="/login">
              <Button variant="outline" size="lg">
                Sign in to view more →
              </Button>
            </Link>
          </div>
        )}
      </section>

      {/* Info section for unauthenticated visitors */}
      {!authLoading && !isAuthenticated && (
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="grid gap-8 sm:grid-cols-3">
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl">
                📸
              </div>
              <h3 className="font-serif text-lg font-semibold">Share</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Upload images, stories, and materials that preserve cultural
                heritage for future generations.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl">
                ✅
              </div>
              <h3 className="font-serif text-lg font-semibold">Curate</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Community reviewers ensure quality and accuracy before resources
                are published.
              </p>
            </div>
            <div className="text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-accent/10 text-2xl">
                🔍
              </div>
              <h3 className="font-serif text-lg font-semibold">Discover</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Browse and search a growing collection of heritage resources
                organized by category and tags.
              </p>
            </div>
          </div>
        </section>
      )}
    </main>
  );
}
