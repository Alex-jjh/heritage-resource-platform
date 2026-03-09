"use client";

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
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1">
        <label htmlFor="search-input" className="sr-only">Search resources</label>
        <Input
          id="search-input"
          placeholder="Search by title, description, or tags…"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && onSearch()}
        />
      </div>
      <div className="w-full sm:w-48">
        <label htmlFor="category-filter" className="sr-only">Filter by category</label>
        <Select value={categoryId} onValueChange={wrapChange(onCategoryChange)}>
          <SelectTrigger id="category-filter">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="w-full sm:w-48">
        <label htmlFor="tag-filter" className="sr-only">Filter by tag</label>
        <Select value={tagId} onValueChange={wrapChange(onTagChange)}>
          <SelectTrigger id="tag-filter">
            <SelectValue placeholder="All tags" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All tags</SelectItem>
            {tags.map((tag) => (
              <SelectItem key={tag.id} value={tag.id}>{tag.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex gap-2">
        <Button onClick={onSearch}>Search</Button>
        {hasFilters && (
          <Button variant="outline" onClick={onClear}>Clear</Button>
        )}
      </div>
    </div>
  );
}
