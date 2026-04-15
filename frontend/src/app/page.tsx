"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { apiClient } from "@/lib/api-client";
import type { Page, ResourceResponse } from "@/types";

export default function Home() {
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const featuredQuery = useQuery({
    queryKey: ["featured-resources"],
    queryFn: () =>
      isAuthenticated
        ? apiClient.get<Page<ResourceResponse>>(`/api/search/resources?page=0&size=8`)
        : apiClient.get<ResourceResponse[]>("/api/search/featured", { skipAuth: true }).then(
            (items) => ({ content: items, totalElements: items.length } as Page<ResourceResponse>)
          ),
  });

  const resources = featuredQuery.data?.content ?? [];

  return (
    <main>
      <div className="bg-slate-700 text-white py-16 px-5 text-center">
        <h1 className="text-3xl mb-3">Discover & Preserve Cultural Heritage</h1>
        <p className="text-gray-300 mb-6">
          A community platform for sharing images, stories, traditions, places, and educational materials.
        </p>
        {isAuthenticated ? (
          <Link href="/browse" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Browse Resources</Link>
        ) : (
          <div className="flex gap-3 justify-center">
            <Link href="/register" className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">Get Started</Link>
            <Link href="/login" className="bg-white text-gray-800 px-4 py-2 rounded hover:bg-gray-100">Sign In</Link>
          </div>
        )}
      </div>

      <div className="max-w-5xl mx-auto px-5 mt-8">
        <h2 className="text-xl font-bold mb-4">Featured Resources</h2>

        {featuredQuery.isLoading || authLoading ? (
          <p className="text-gray-500">Loading...</p>
        ) : featuredQuery.isError ? (
          <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm">Unable to load featured resources.</div>
        ) : resources.length === 0 ? (
          <p className="text-gray-400 text-center py-10">No approved resources yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {resources.map((resource) => (
              <Link key={resource.id} href={`/resources/${resource.id}`} className="no-underline text-inherit">
                <div className="bg-white border border-gray-200 rounded p-4 h-full">
                  <div className="bg-gray-100 h-36 flex items-center justify-center rounded mb-3 overflow-hidden">
                    {resource.thumbnailUrl ? (
                      <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-gray-400 text-sm">No image</span>
                    )}
                  </div>
                  <h3 className="text-base font-semibold m-0 mb-1">{resource.title}</h3>
                  <p className="text-sm text-gray-500 m-0">{resource.category.name}</p>
                  {resource.place && <p className="text-xs text-gray-400 mt-0.5">{resource.place}</p>}
                  {resource.tags.length > 0 && (
                    <div className="mt-2 flex gap-1 flex-wrap">
                      {resource.tags.slice(0, 3).map((tag) => (
                        <span key={tag.id} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{tag.name}</span>
                      ))}
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!isAuthenticated && resources.length > 0 && (
          <div className="text-center mt-5">
            <Link href="/login" className="text-blue-600 hover:underline text-sm">Sign in to view more</Link>
          </div>
        )}
      </div>

      {!authLoading && !isAuthenticated && (
        <div className="max-w-5xl mx-auto px-5 mt-8 pb-10">
          <div className="grid grid-cols-3 gap-5 text-center">
            <div>
              <h3 className="font-bold">Share</h3>
              <p className="text-sm text-gray-500">Upload images, stories, and materials that preserve cultural heritage.</p>
            </div>
            <div>
              <h3 className="font-bold">Curate</h3>
              <p className="text-sm text-gray-500">Community reviewers ensure quality and accuracy before publishing.</p>
            </div>
            <div>
              <h3 className="font-bold">Discover</h3>
              <p className="text-sm text-gray-500">Browse and search a growing collection organized by category and tags.</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
