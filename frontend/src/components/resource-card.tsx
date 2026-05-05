"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
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

  if (!imageUrl || imageFailed) {
    return (
      <span className="text-muted-foreground/40" aria-hidden="true">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
          <circle cx="8.5" cy="8.5" r="1.5"/>
          <polyline points="21 15 16 10 5 21"/>
        </svg>
      </span>
    );
  }

  return (
    <img
      src={imageUrl}
      alt={title}
      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
      <Card className="h-full overflow-hidden transition-shadow group-hover:shadow-md">
        <CardHeader className="p-4 pb-2">
          <div className="flex aspect-[4/3] w-full items-center justify-center overflow-hidden rounded-md bg-muted">
            <ResourceImage resource={resource} imageUrl={imageUrl} />
          </div>
        </CardHeader>

        <CardContent className="space-y-2 px-4 pb-2 pt-0">
          <h3 className="line-clamp-2 font-serif text-lg font-semibold leading-tight">
            {title}
          </h3>

          <p className="text-sm text-muted-foreground">{categoryName}</p>

          {resource.place && (
            <p className="line-clamp-1 text-xs text-muted-foreground">
              {resource.place}
            </p>
          )}
        </CardContent>

        {tags.length > 0 && (
          <CardFooter className="flex flex-wrap gap-1 px-4 pb-4 pt-2">
            {tags.slice(0, 3).map((tag) => (
              <Badge key={tag.id} variant="outline" className="text-xs">
                {tag.name}
              </Badge>
            ))}

            {tags.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{tags.length - 3}
              </Badge>
            )}
          </CardFooter>
        )}
      </Card>
    </Link>
  );
}

export default ResourceCard;
