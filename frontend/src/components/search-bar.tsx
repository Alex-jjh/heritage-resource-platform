"use client";

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

export function SearchBar({
  query, onQueryChange, categoryId, onCategoryChange, tagId, onTagChange,
  categories, tags, onSearch, onClear,
}: SearchBarProps) {
  const hasFilters = query || categoryId || tagId;

  return (
    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
      <input
        type="search"
        placeholder="Search by title, description, or tags..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        style={{ flex: 1, minWidth: 200 }}
      />
      <select value={categoryId || ""} onChange={(e) => onCategoryChange(e.target.value)} style={{ width: 180 }}>
        <option value="">All categories</option>
        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
      </select>
      <select value={tagId || ""} onChange={(e) => onTagChange(e.target.value)} style={{ width: 180 }}>
        <option value="">All tags</option>
        {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
      </select>
      <button className="btn btn-primary" onClick={onSearch}>Search</button>
      <button className="btn" onClick={onClear} disabled={!hasFilters}>Clear</button>
    </div>
  );
}
