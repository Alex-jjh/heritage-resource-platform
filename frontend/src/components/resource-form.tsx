"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { FileUploader } from "@/components/file-uploader";
import type { Category, Tag, ResourceResponse, FileReferenceDto } from "@/types";

export interface ResourceFormData {
  title: string;
  categoryId: string;
  place: string;
  description: string;
  copyrightDeclaration: string;
  tagIds: string[];
  externalLinks: { url: string; label: string }[];
}

interface ResourceFormProps {
  resource?: ResourceResponse;
  onSubmit: (data: ResourceFormData) => Promise<void>;
  isSubmitting: boolean;
  submitLabel: string;
  error?: string | null;
  resourceId?: string;
  onFilesChange?: () => void;
}

export function ResourceForm({ resource, onSubmit, isSubmitting, submitLabel, error, resourceId, onFilesChange }: ResourceFormProps) {
  const [title, setTitle] = useState(resource?.title ?? "");
  const [categoryId, setCategoryId] = useState(resource?.category?.id ?? "");
  const [place, setPlace] = useState(resource?.place ?? "");
  const [description, setDescription] = useState(resource?.description ?? "");
  const [copyrightDeclaration, setCopyrightDeclaration] = useState(resource?.copyrightDeclaration ?? "");
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(resource?.tags?.map((t) => t.id) ?? []);
  const [externalLinks, setExternalLinks] = useState<{ url: string; label: string }[]>(
    resource?.externalLinks?.map((l) => ({ url: l.url, label: l.label })) ?? []
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => apiClient.get<Category[]>("/api/categories"),
  });

  const tagsQuery = useQuery({
    queryKey: ["tags"],
    queryFn: () => apiClient.get<Tag[]>("/api/tags"),
  });

  useEffect(() => {
    if (resource) {
      setTitle(resource.title);
      setCategoryId(resource.category?.id ?? "");
      setPlace(resource.place ?? "");
      setDescription(resource.description ?? "");
      setCopyrightDeclaration(resource.copyrightDeclaration ?? "");
      setSelectedTagIds(resource.tags?.map((t) => t.id) ?? []);
      setExternalLinks(resource.externalLinks?.map((l) => ({ url: l.url, label: l.label })) ?? []);
    }
  }, [resource]);

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => prev.includes(tagId) ? prev.filter((id) => id !== tagId) : [...prev, tagId]);
  }

  function addLink() {
    setExternalLinks((prev) => [...prev, { url: "", label: "" }]);
  }

  function updateLink(index: number, field: "url" | "label", value: string) {
    setExternalLinks((prev) => prev.map((link, i) => (i === index ? { ...link, [field]: value } : link)));
  }

  function removeLink(index: number) {
    setExternalLinks((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: string[] = [];
    if (!title.trim()) errors.push("Title is required");
    if (!categoryId) errors.push("Category is required");
    if (!copyrightDeclaration.trim()) errors.push("Copyright declaration is required");
    if (errors.length > 0) { setValidationErrors(errors); return; }
    setValidationErrors([]);

    await onSubmit({
      title: title.trim(),
      categoryId,
      place: place.trim() || undefined!,
      description: description.trim() || undefined!,
      copyrightDeclaration: copyrightDeclaration.trim(),
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined!,
      externalLinks: externalLinks.filter((l) => l.url.trim()).length > 0 ? externalLinks.filter((l) => l.url.trim()) : undefined!,
    });
  }

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const existingFiles: FileReferenceDto[] = resource?.fileReferences ?? [];

  return (
    <form onSubmit={handleSubmit}>
      {(validationErrors.length > 0 || error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded text-sm mb-3">
          {validationErrors.map((err) => <p key={err} className="my-0.5">{err}</p>)}
          {error && <p className="my-0.5">{error}</p>}
        </div>
      )}

      <div className="mb-4">
        <label htmlFor="title" className="block text-sm font-bold mb-1">Title *</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter resource title" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <div className="mb-4">
        <label htmlFor="category" className="block text-sm font-bold mb-1">Category *</label>
        <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500">
          <option value="">Select a category</option>
          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label htmlFor="place" className="block text-sm font-bold mb-1">Place</label>
        <input id="place" type="text" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Location or place of origin" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <div className="mb-4">
        <label htmlFor="description" className="block text-sm font-bold mb-1">Description</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this heritage resource..." rows={5} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
      </div>

      <div className="mb-4">
        <label className="block text-sm font-bold mb-1">Tags</label>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className={`px-2.5 py-1 rounded-xl border text-[13px] cursor-pointer ${
                  selected
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300"
                }`}
              >
                {tag.name}
              </button>
            );
          })}
          {tags.length === 0 && <p className="text-gray-400 text-sm">No tags available</p>}
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="copyright" className="block text-sm font-bold mb-1">Copyright Declaration *</label>
        <textarea id="copyright" value={copyrightDeclaration} onChange={(e) => setCopyrightDeclaration(e.target.value)} placeholder="Declare copyright ownership or licensing..." rows={3} className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
      </div>

      {resourceId && (
        <div className="mb-4">
          <label className="block text-sm font-bold mb-1">File Attachments</label>
          <FileUploader resourceId={resourceId} existingFiles={existingFiles} onFilesChange={onFilesChange ?? (() => {})} />
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="text-sm font-bold">External Links</label>
          <button type="button" className="bg-white border border-gray-300 px-2 py-1 rounded text-xs hover:bg-gray-50" onClick={addLink}>+ Add Link</button>
        </div>
        {externalLinks.map((link, index) => (
          <div key={index} className="flex gap-2 mb-2">
            <div className="flex-1">
              <input type="text" value={link.url} onChange={(e) => updateLink(index, "url", e.target.value)} placeholder="https://example.com" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500 mb-1" />
              <input type="text" value={link.label} onChange={(e) => updateLink(index, "label", e.target.value)} placeholder="Link label (optional)" className="w-full border border-gray-300 rounded px-2 py-1.5 text-sm focus:outline-none focus:border-blue-500" />
            </div>
            <button type="button" className="bg-red-600 text-white px-2 py-1 rounded text-xs hover:bg-red-700 self-start" onClick={() => removeLink(index)}>Remove</button>
          </div>
        ))}
      </div>

      <button type="submit" className="bg-blue-600 text-white px-3 py-1.5 rounded text-sm hover:bg-blue-700 disabled:opacity-50" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
