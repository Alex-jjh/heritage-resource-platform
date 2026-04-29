"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { FileUploader } from "@/components/file-uploader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import type {
  Category,
  Tag,
  ResourceResponse,
  FileReferenceDto,
} from "@/types";

export interface ResourceFormData {
  title?: string;
  categoryId?: string;
  place?: string;
  description?: string;
  copyrightDeclaration?: string;
  tagIds?: string[];
  externalLinks?: { url: string; label: string }[];
}

interface ResourceFormProps {
  /** Existing resource for edit mode */
  resource?: ResourceResponse;
  /** Called on save with form data */
  onSubmit: (data: ResourceFormData) => Promise<void>;
  /** Loading state for submit button */
  isSubmitting: boolean;
  /** Submit button label */
  submitLabel: string;
  /** Error message from parent */
  error?: string | null;
  /** Resource ID for file uploads (only available in edit mode) */
  resourceId?: string;
  /** Callback when files change */
  onFilesChange?: () => void;
}

export function ResourceForm({
  resource,
  onSubmit,
  isSubmitting,
  submitLabel,
  error,
  resourceId,
  onFilesChange,
}: ResourceFormProps) {
  const [title, setTitle] = useState(resource?.title ?? "");
  const [categoryId, setCategoryId] = useState(
    resource?.category?.id ?? ""
  );
  const [place, setPlace] = useState(resource?.place ?? "");
  const [description, setDescription] = useState(
    resource?.description ?? ""
  );
  const [copyrightDeclaration, setCopyrightDeclaration] = useState(
    resource?.copyrightDeclaration ?? ""
  );
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>(
    resource?.tags?.map((t) => t.id) ?? []
  );
  const [externalLinks, setExternalLinks] = useState<
    { url: string; label: string }[]
  >(
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

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  }

  function addExternalLink() {
    setExternalLinks((prev) => [...prev, { url: "", label: "" }]);
  }

  function updateExternalLink(
    index: number,
    field: "url" | "label",
    value: string
  ) {
    setExternalLinks((prev) =>
      prev.map((link, i) => (i === index ? { ...link, [field]: value } : link))
    );
  }

  function removeExternalLink(index: number) {
    setExternalLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function isValidExternalUrl(value: string) {
    try {
      const url = new URL(value);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errors: string[] = [];

    const cleanedExternalLinks = externalLinks
      .map((link) => ({
        url: link.url.trim(),
        label: link.label.trim(),
      }))
      .filter((link) => link.url.length > 0);

    cleanedExternalLinks.forEach((link, index) => {
      if (!isValidExternalUrl(link.url)) {
        errors.push(
          `External link ${index + 1} must be a valid http or https URL`
        );
      }
    });

    if (errors.length > 0) {
      setValidationErrors(errors);
      return;
    }
    setValidationErrors([]);

    await onSubmit({
      title: title.trim() || undefined,
      categoryId: categoryId || undefined,
      place: place.trim() || undefined,
      description: description.trim() || undefined,
      copyrightDeclaration: copyrightDeclaration.trim() || undefined,
      tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
      externalLinks: cleanedExternalLinks.length > 0 ? cleanedExternalLinks : undefined,
    });
  }

  const categories = categoriesQuery.data ?? [];
  const tags = tagsQuery.data ?? [];
  const existingFiles: FileReferenceDto[] = resource?.fileReferences ?? [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {(validationErrors.length > 0 || error) && (
        <div
          role="alert"
          className="rounded-md bg-destructive/10 p-3 text-sm text-destructive space-y-1"
        >
          {validationErrors.map((err) => (
            <p key={err}>{err}</p>
          ))}
          {error && <p>{error}</p>}
        </div>
      )}

      {/* Title */}
      <div className="space-y-1.5">
        <Label htmlFor="title">
          Title
        </Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Enter resource title"
        />
      </div>

      {/* Category */}
      <div className="space-y-1.5">
        <Label htmlFor="category">
          Category
        </Label>
        <Select value={categoryId} onValueChange={(val) => setCategoryId(val ?? "")}>
          <SelectTrigger className="w-full" id="category">
            <SelectValue>
              {categoryId
                ? categories.find((c) => c.id === categoryId)?.name ?? "Select a category"
                : "Select a category"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {categories.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>
                {cat.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Place */}
      <div className="space-y-1.5">
        <Label htmlFor="place">Place</Label>
        <Input
          id="place"
          value={place}
          onChange={(e) => setPlace(e.target.value)}
          placeholder="Location or place of origin"
        />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe this heritage resource…"
          rows={5}
        />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label>Tags</Label>
        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => {
            const selected = selectedTagIds.includes(tag.id);
            return (
              <button
                key={tag.id}
                type="button"
                onClick={() => toggleTag(tag.id)}
                className="focus:outline-none"
              >
                <Badge
                  variant={selected ? "default" : "outline"}
                  className="cursor-pointer"
                >
                  {tag.name}
                </Badge>
              </button>
            );
          })}
          {tags.length === 0 && (
            <p className="text-sm text-muted-foreground">No tags available</p>
          )}
        </div>
      </div>

      {/* Copyright Declaration */}
      <div className="space-y-1.5">
        <Label htmlFor="copyright">
          Copyright Declaration
        </Label>
        <Textarea
          id="copyright"
          value={copyrightDeclaration}
          onChange={(e) => setCopyrightDeclaration(e.target.value)}
          placeholder="Declare copyright ownership or licensing…"
          rows={3}
        />
      </div>

      {/* File Attachments (only in edit mode when resourceId is available) */}
      {resourceId && (
        <div className="space-y-1.5">
          <Label>File Attachments</Label>
          <FileUploader
            resourceId={resourceId}
            existingFiles={existingFiles}
            onFilesChange={onFilesChange ?? (() => { })}
          />
        </div>
      )}

      {/* External Links */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>External Links</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addExternalLink}
          >
            <Plus className="mr-1 size-3.5" />
            Add Link
          </Button>
        </div>
        {externalLinks.map((link, index) => (
          <div key={index} className="flex items-start gap-2">
            <div className="flex-1 space-y-1.5">
              <Input
                value={link.url}
                onChange={(e) =>
                  updateExternalLink(index, "url", e.target.value)
                }
                placeholder="https://example.com"
                aria-label={`External link URL ${index + 1}`}
              />
              <Input
                value={link.label}
                onChange={(e) =>
                  updateExternalLink(index, "label", e.target.value)
                }
                placeholder="Link label (optional)"
                aria-label={`External link label ${index + 1}`}
              />
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => removeExternalLink(index)}
              aria-label={`Remove link ${index + 1}`}
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        ))}
      </div>

      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
