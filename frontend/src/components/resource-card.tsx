"use client";

import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import type { ResourceResponse } from "@/types";

export function ResourceCard({ resource }: { resource: ResourceResponse }) {
  return (
    <Link href={`/resources/${resource.id}`} className="block group">
      <Card className="h-full transition-shadow group-hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="aspect-[4/3] w-full rounded-md bg-muted flex items-center justify-center overflow-hidden">
            {resource.thumbnailS3Key ? (
              <img
                src={resource.thumbnailS3Key}
                alt={resource.title}
                className="h-full w-full object-cover"
              />
            ) : (
              <span className="text-3xl text-muted-foreground" aria-hidden="true">🏛️</span>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          <h3 className="font-serif text-lg font-semibold leading-tight line-clamp-2">
            {resource.title}
          </h3>
          <p className="text-sm text-muted-foreground">{resource.category.name}</p>
          {resource.place && (
            <p className="text-xs text-muted-foreground">{resource.place}</p>
          )}
        </CardContent>
        <CardFooter className="flex flex-wrap gap-1 pt-0">
          {resource.tags.slice(0, 3).map((tag) => (
            <Badge key={tag.id} variant="outline" className="text-xs">
              {tag.name}
            </Badge>
          ))}
          {resource.tags.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{resource.tags.length - 3}
            </Badge>
          )}
        </CardFooter>
      </Card>
    </Link>
  );
}
