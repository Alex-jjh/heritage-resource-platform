"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { FileReferenceDto, ResourceResponse } from "@/types";

function isImageFile(file: FileReferenceDto) {
  return file.contentType?.toLowerCase().startsWith("image/");
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

  if (!imageUrl || imageFailed) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted text-4xl text-muted-foreground">
        🏛️
      </div>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={resource.title}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
      loading="lazy"
      onError={() => setImageFailed(true)}
    />
  );
}

export function ResourceCard({ resource }: { resource: ResourceResponse }) {
  const imageUrl = getResourceImageUrl(resource);
  const tags = resource.tags ?? [];

  return (
    <Link
      href={`/resources/${resource.id}`}
      className="group block overflow-hidden rounded-lg border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <ResourceImage resource={resource} imageUrl={imageUrl} />
      </div>

      <div className="space-y-2 p-4">
        <h3 className="line-clamp-2 font-serif text-lg font-semibold leading-tight">
          {resource.title}
        </h3>

        <div className="space-y-1 text-sm text-muted-foreground">
          <p>{resource.category?.name ?? "Uncategorized"}</p>

          {resource.place && <p className="line-clamp-1">{resource.place}</p>}
        </div>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 border-t bg-muted/30 px-4 py-3">
          {tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} variant="secondary" className="text-xs">
              {tag.name}
            </Badge>
          ))}

          {tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{tags.length - 3}
            </Badge>
          )}
        </div>
      )}
    </Link>
  );
}

export default ResourceCard;