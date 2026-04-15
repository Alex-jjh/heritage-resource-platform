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
        <div className="error-msg">
          {validationErrors.map((err) => <p key={err} style={{ margin: "2px 0" }}>{err}</p>)}
          {error && <p style={{ margin: "2px 0" }}>{error}</p>}
        </div>
      )}

      <div className="form-group">
        <label htmlFor="title">Title *</label>
        <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter resource title" />
      </div>

      <div className="form-group">
        <label htmlFor="category">Category *</label>
        <select id="category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">Select a category</option>
          {categories.map((cat) => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="place">Place</label>
        <input id="place" type="text" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="Location or place of origin" />
      </div>

      <div className="form-group">
        <label htmlFor="description">Description</label>
        <textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe this heritage resource..." rows={5} />
      </div>

      <div className="form-group">
        <label>Tags</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                style={{
                  padding: "4px 10px",
                  borderRadius: 12,
                  border: "1px solid #ccc",
                  background: selected ? "#1a73e8" : "#fff",
                  color: selected ? "#fff" : "#333",
                  cursor: "pointer",
                  fontSize: 13,
                }}
              >
                {tag.name}
              </button>
            );
          })}
          {tags.length === 0 && <p style={{ color: "#888", fontSize: 14 }}>No tags available</p>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="copyright">Copyright Declaration *</label>
        <textarea id="copyright" value={copyrightDeclaration} onChange={(e) => setCopyrightDeclaration(e.target.value)} placeholder="Declare copyright ownership or licensing..." rows={3} />
      </div>

      {resourceId && (
        <div className="form-group">
          <label>File Attachments</label>
          <FileUploader resourceId={resourceId} existingFiles={existingFiles} onFilesChange={onFilesChange ?? (() => {})} />
        </div>
      )}

      <div className="form-group">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
          <label style={{ margin: 0 }}>External Links</label>
          <button type="button" className="btn btn-sm" onClick={addLink}>+ Add Link</button>
        </div>
        {externalLinks.map((link, index) => (
          <div key={index} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
            <div style={{ flex: 1 }}>
              <input type="text" value={link.url} onChange={(e) => updateLink(index, "url", e.target.value)} placeholder="https://example.com" style={{ marginBottom: 4 }} />
              <input type="text" value={link.label} onChange={(e) => updateLink(index, "label", e.target.value)} placeholder="Link label (optional)" />
            </div>
            <button type="button" className="btn btn-sm btn-danger" onClick={() => removeLink(index)}>✕</button>
          </div>
        ))}
      </div>

      <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : submitLabel}
      </button>
    </form>
  );
}
