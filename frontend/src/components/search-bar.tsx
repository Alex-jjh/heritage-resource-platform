"use client";

import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import type { Category, Tag } from "@/types";

interface SearchBarProps {
  query: string;
  onQueryChange: (value: string) => void;
  categoryId: string;
  onCategoryChange: (value: string) => void;
  tagId: string;
  onTagChange: (value: string) => void;
  categories: Category[];
  tags: Tag[];
  onSearch: () => void;
  onClear: () => void;
}

function wrapChange(fn: (value: string) => void) {
  return (value: string | null) => fn(value ?? "");
}

export function SearchBar({
  query,
  onQueryChange,
  categoryId,
  onCategoryChange,
  tagId,
  onTagChange,
  categories,
  tags,
  onSearch,
  onClear,
}: SearchBarProps) {
  const hasFilters = query || categoryId || tagId;

  return (
    <div className="rounded-2xl border border-border bg-white shadow-[var(--shadow-heritage-card)]">
      <div className="grid gap-3 border-b border-border p-4 lg:grid-cols-12">
        <div className="relative lg:col-span-8">
          <label htmlFor="search-input" className="sr-only">
            Search resources
          </label>
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="search-input"
            placeholder="Search by title, description, or tags..."
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onSearch()}
            className="pl-9"
          />
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="category-filter" className="sr-only">
            Filter by category
          </label>
          <Select value={categoryId || "all"} onValueChange={wrapChange(onCategoryChange)}>
            <SelectTrigger id="category-filter" className="w-full">
              <SelectValue>
                {categoryId && categoryId !== "all"
                  ? categories.find((c) => c.id === categoryId)?.name ?? categoryId
                  : "All categories"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.id} value={cat.id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="lg:col-span-2">
          <label htmlFor="tag-filter" className="sr-only">
            Filter by tag
          </label>
          <Select value={tagId || "all"} onValueChange={wrapChange(onTagChange)}>
            <SelectTrigger id="tag-filter" className="w-full">
              <SelectValue>
                {tagId && tagId !== "all"
                  ? tags.find((t) => t.id === tagId)?.name ?? tagId
                  : "All tags"}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tags</SelectItem>
              {tags.map((tag) => (
                <SelectItem key={tag.id} value={tag.id}>
                  {tag.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex flex-wrap justify-end gap-2 p-4">
        <Button onClick={onSearch}>Search</Button>
        <Button variant="outline" onClick={onClear} disabled={!hasFilters}>
          Clear
        </Button>
      </div>
    </div>
  );
}
