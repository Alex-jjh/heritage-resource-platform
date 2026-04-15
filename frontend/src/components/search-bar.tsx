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
    <div className="flex gap-2 flex-wrap">
      <input
        type="search"
        placeholder="Search by title, description, or tags..."
        value={query}
        onChange={(e) => onQueryChange(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && onSearch()}
        className="flex-1 min-w-[200px] border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500"
      />
      <select value={categoryId || ""} onChange={(e) => onCategoryChange(e.target.value)} className="w-[180px] border border-gray-300 rounded px-2 py-1.5 text-sm">
        <option value="">All categories</option>
        {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
      </select>
      <select value={tagId || ""} onChange={(e) => onTagChange(e.target.value)} className="w-[180px] border border-gray-300 rounded px-2 py-1.5 text-sm">
        <option value="">All tags</option>
        {tags.map((tag) => <option key={tag.id} value={tag.id}>{tag.name}</option>)}
      </select>
      <button className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700" onClick={onSearch}>Search</button>
      <button className="bg-white border border-gray-300 px-3 py-1.5 rounded text-sm hover:bg-gray-50 disabled:opacity-50" onClick={onClear} disabled={!hasFilters}>Clear</button>
    </div>
  );
}
