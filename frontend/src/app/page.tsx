"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import { ResourceCard } from "@/components/resource-card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import type { ResourceResponse } from "@/types";

const FEATURED_COUNT = 8;

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const featuredQuery = useQuery({
    queryKey: ["featured-resources"],
    queryFn: () =>
      apiClient.get<ResourceResponse[]>("/api/resources/homepage-featured", {
        skipAuth: true,
      }),
  });

  const resources = (featuredQuery.data ?? []).slice(0, FEATURED_COUNT);

  return (
    <main>
      <section className="relative overflow-hidden py-28 sm:py-36">
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/hero-bg.jpeg')" }}
        />

        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]" />

        <div className="relative px-6 sm:px-12 lg:px-16">
          <div className="max-w-2xl">
            <h1 className="text-4xl font-semibold tracking-tight text-white sm:text-5xl">
              Discover &amp; Preserve
              <br />
              Cultural Heritage
            </h1>

            <p className="mt-5 text-lg leading-relaxed text-white/80">
              A community platform for sharing images, stories, traditions,
              places, and educational materials that celebrate our shared
              cultural heritage.
            </p>

            <div className="mt-10 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link href="/browse">
                  <Button
                    size="lg"
                    className="rounded-full bg-[#0071e3] px-8 text-white shadow-lg hover:bg-[#0077ED]"
                  >
                    Browse Resources
                  </Button>
                </Link>
              ) : (
                <>
                  <Link href="/register">
                    <Button
                      size="lg"
                      className="rounded-full bg-[#0071e3] px-8 text-white shadow-lg hover:bg-[#0077ED]"
                    >
                      Get Started
                    </Button>
                  </Link>

                  <Link href="/login">
                    <Button
                      size="lg"
                      variant="outline"
                      className="rounded-full border-white/60 px-8 text-white hover:border-white hover:bg-white/10"
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

      <section className="px-6 py-12 sm:px-12 lg:px-16">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-2xl font-semibold tracking-tight">
              Featured Resources
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Curated selections from our community.
            </p>
          </div>

          {isAuthenticated && (
            <Link href="/browse">
              <Button variant="link" className="text-accent">
                Browse all →
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
            <div className="rounded-lg border bg-card px-6 py-16 text-center">
              <p className="text-lg font-medium">
                No featured resources have been selected yet.
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Approved resources selected by administrators will appear here.
              </p>

              <div className="mt-6">
                <Link href={isAuthenticated ? "/browse" : "/login"}>
                  <Button variant="outline">
                    {isAuthenticated ? "Browse resources" : "Sign in to browse"}
                  </Button>
                </Link>
              </div>
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

      {!authLoading && !isAuthenticated && (
        <section className="border-t px-6 py-20 sm:px-12 lg:px-16">
          <div className="grid gap-12 sm:grid-cols-3">
            <div>
              <h3 className="text-lg font-semibold">Share</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Upload images, stories, and materials that preserve cultural
                heritage for future generations.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold">Curate</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                Community reviewers ensure quality and accuracy before resources
                are published.
              </p>
            </div>

            <div>
              <h3 className="text-lg font-semibold">Discover</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
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