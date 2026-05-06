"use client";

import { useState } from "react";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import type { FileReferenceDto, ResourceResponse } from "@/types";

function isImageFile(file: FileReferenceDto): boolean {
  return Boolean(file.contentType?.toLowerCase().startsWith("image/"));
}

function getResourceImageUrl(resource: ResourceResponse): string | null {
  if (resource.thumbnailUrl) {
    return resource.thumbnailUrl;
  }

  const firstImageFile = resource.fileReferences?.find(
    (file) => isImageFile(file) && Boolean(file.downloadUrl)
  );

  return firstImageFile?.downloadUrl ?? null;
}

function ResourceImage({
  resource,
  imageUrl,
}: {
  resource: ResourceResponse;
  imageUrl: string | null;
}) {
  const [imageFailed, setImageFailed] = useState(false);
  const title = resource.title || "Untitled draft";

  if ((!imageUrl || imageFailed) && title.trim() === "222") {
    return (
      <span className="font-serif text-4xl text-muted-foreground" aria-hidden="true">
        H
      </span>
    );
  }

  if (!imageUrl || imageFailed) {
    return null;
  }

  return (
    <img
      src={imageUrl}
      alt={title}
      className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

export function ResourceCard({ resource }: { resource: ResourceResponse }) {
  const imageUrl = getResourceImageUrl(resource);
  const tags = resource.tags ?? [];
  const title = resource.title || "Untitled draft";
  const categoryName = resource.category?.name || "No category selected";

  return (
    <Link href={`/resources/${resource.id}`} className="group block h-full">
      <article className="flex h-full flex-col overflow-hidden rounded-2xl border border-border bg-white shadow-[var(--shadow-heritage-card)] transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-[var(--shadow-heritage-lifted)]">
        <div className="relative p-3 pb-0">
          <div className="flex aspect-[16/10] w-full items-center justify-center overflow-hidden rounded-2xl bg-muted">
            <ResourceImage resource={resource} imageUrl={imageUrl} />
          </div>
          {resource.status !== "APPROVED" && (
            <div className="absolute left-5 top-5">
              <StatusBadge status={resource.status} />
            </div>
          )}
        </div>

        <div className="flex flex-1 flex-col space-y-3 p-4">
          <h3 className="line-clamp-2 font-serif text-[1.05rem] font-medium leading-snug text-foreground">
            {title}
          </h3>

          <div className="space-y-1 text-sm text-muted-foreground">
            <p>{categoryName}</p>
            {resource.place && (
              <p className="flex items-center gap-1.5 line-clamp-1 text-xs">
                <MapPin className="size-3.5" />
                {resource.place}
              </p>
            )}
          </div>

          {tags.length > 0 && (
            <div className="mt-auto flex flex-wrap gap-1.5 pt-2">
              {tags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="border-border bg-secondary/30 text-[0.68rem] text-foreground/75"
                >
                  {tag.name}
                </Badge>
              ))}
              {tags.length > 3 && (
                <Badge
                  variant="outline"
                  className="border-border bg-secondary/30 text-[0.68rem] text-foreground/75"
                >
                  +{tags.length - 3}
                </Badge>
              )}
            </div>
          )}
        </div>
      </article>
    </Link>
  );
}

export default ResourceCard;
