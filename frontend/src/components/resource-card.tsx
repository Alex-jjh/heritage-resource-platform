"use client";

import Link from "next/link";
import type { ResourceResponse } from "@/types";

export function ResourceCard({ resource }: { resource: ResourceResponse }) {
  return (
    <Link href={`/resources/${resource.id}`} className="no-underline text-inherit">
      <div className="bg-white border border-gray-200 rounded p-4 mb-3 h-full">
        <div className="bg-gray-100 h-[150px] flex items-center justify-center rounded mb-2.5 overflow-hidden">
          {resource.thumbnailUrl ? (
            <img src={resource.thumbnailUrl} alt={resource.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-sm text-gray-400">No image</span>
          )}
        </div>
        <h3 className="m-0 mb-1 text-base">{resource.title}</h3>
        <p className="m-0 text-[13px] text-gray-500">{resource.category.name}</p>
        {resource.place && <p className="mt-0.5 mb-0 text-xs text-gray-400">{resource.place}</p>}
        {resource.tags.length > 0 && (
          <div className="mt-1.5 flex gap-1 flex-wrap">
            {resource.tags.slice(0, 3).map((tag) => (
              <span key={tag.id} className="bg-gray-200 px-1.5 py-0.5 rounded-lg text-[11px]">{tag.name}</span>
            ))}
          </div>
        )}
      </div>
    </Link>
  );
}
