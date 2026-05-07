"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import {
  Archive,
  ArrowUpRight,
  Compass,
  Heart,
  MapPin,
  Quote,
} from "lucide-react";
import { apiClient } from "@/lib/api-client";
import { useAuth } from "@/lib/auth-context";
import type { ResourceResponse } from "@/types";

type HomeResource = {
  id: string;
  resourceId?: string;
  index: string;
  title: string;
  category: string;
  place: string;
  tags: string[];
  image: string | null;
  excerpt: string;
  year: string;
};

type HomepageStats = {
  resourceCount: number;
  userCount: number;
};

type SeasonKey = "spring" | "summer" | "autumn" | "winter";

const seasons: {
  key: SeasonKey;
  label: string;
  year: string;
  issue: string;
  coords: string;
  plate: string;
  caption: string;
  note: string;
  image: string;
}[] = [
  {
    key: "spring",
    label: "Spring",
    year: "2026",
    issue: "Vol. II / Issue 01",
    coords: "35.0160 N / 135.7822 E",
    plate: "Plate II",
    caption: "Heian-jingu at peak bloom, Kyoto.",
    note: "Selected for the spring edition.",
    image: "/heritage/seasons/spring.webp",
  },
  {
    key: "summer",
    label: "Summer",
    year: "2026",
    issue: "Vol. I / Issue 04",
    coords: "41.8902 N / 12.4922 E",
    plate: "Plate I",
    caption: "The Flavian Amphitheatre, Rome.",
    note: "Selected for the inaugural collection.",
    image: "/heritage/seasons/summer.webp",
  },
  {
    key: "autumn",
    label: "Autumn",
    year: "2026",
    issue: "Vol. II / Issue 03",
    coords: "44.2601 N / 72.5754 W",
    plate: "Plate III",
    caption: "White-steepled chapel amid New England foliage.",
    note: "Selected for the autumn edition.",
    image: "/heritage/seasons/autumn.webp",
  },
  {
    key: "winter",
    label: "Winter",
    year: "2026",
    issue: "Vol. II / Issue 04",
    coords: "65.6835 N / 18.1262 W",
    plate: "Plate IV",
    caption: "Aurora borealis over a lone Icelandic farmhouse.",
    note: "Selected for the winter edition.",
    image: "/heritage/seasons/winter.webp",
  },
];

const retainedResourceImages = [
  {
    match: "shibuya crossing",
    image: "/heritage/prototype/Shibuya_Crossing__Aerial.webp",
  },
  {
    match: "colosseum",
    image: "/heritage/prototype/colloseum.webp",
  },
];

function isImageFile(file: ResourceResponse["fileReferences"][number]) {
  return Boolean(file.downloadUrl && file.contentType?.toLowerCase().startsWith("image/"));
}

function getResourceImage(resource: ResourceResponse) {
  if (resource.thumbnailUrl) return resource.thumbnailUrl;
  const image = resource.fileReferences?.find(isImageFile);
  if (image?.downloadUrl) return image.downloadUrl;

  const title = (resource.title ?? "").toLowerCase();
  return retainedResourceImages.find((entry) => title.includes(entry.match))?.image ?? null;
}

function formatStat(value?: number) {
  if (typeof value !== "number") {
    return "—";
  }

  return new Intl.NumberFormat("en-US").format(value);
}

function normalizeResource(
  resource: ResourceResponse,
  index: number,
  forceTitle?: string
): HomeResource {
  const approvedYear = resource.approvedAt
    ? new Date(resource.approvedAt).getFullYear().toString()
    : new Date(resource.updatedAt).getFullYear().toString();

  return {
    id: resource.id,
    resourceId: resource.id,
    index: String(index + 1).padStart(2, "0"),
    title: forceTitle ?? resource.title ?? "Untitled draft",
    category: resource.category?.name ?? "No category selected",
    place: resource.place ?? "Unspecified place",
    tags: (resource.tags ?? []).slice(0, 2).map((tag) => tag.name),
    image: getResourceImage(resource),
    excerpt:
      resource.description ||
      "A featured archive record selected by the editorial team for the current collection.",
    year: approvedYear,
  };
}

function getResourceHref(resource: HomeResource) {
  return resource.resourceId ? `/resources/${resource.resourceId}` : "/browse";
}

function useReplayOnView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [replayKey, setReplayKey] = useState(0);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    let wasVisible = false;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !wasVisible) {
          setReplayKey((key) => key + 1);
          wasVisible = true;
        }

        if (!entry.isIntersecting) {
          wasVisible = false;
        }
      },
      { rootMargin: "-12% 0px -12% 0px", threshold: 0.32 }
    );

    observer.observe(node);

    return () => observer.disconnect();
  }, []);

  return [ref, replayKey] as const;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [activeSeason, setActiveSeason] = useState(0);
  const season = seasons[activeSeason];
  const [heroReplayRef, heroReplayKey] = useReplayOnView<HTMLElement>();
  const [quoteReplayRef, quoteReplayKey] = useReplayOnView<HTMLElement>();

  const featuredQuery = useQuery({
    queryKey: ["featured-resources"],
    queryFn: () =>
      apiClient.get<ResourceResponse[]>("/api/resources/homepage-featured", {
        skipAuth: true,
      }),
  });

  const statsQuery = useQuery({
    queryKey: ["homepage-stats"],
    queryFn: () =>
      apiClient.get<HomepageStats>("/api/stats/homepage", {
        skipAuth: true,
      }),
    refetchInterval: 30_000,
    staleTime: 10_000,
  });

  const featuredResources = useMemo(() => {
    const apiFeatured = featuredQuery.data ?? [];
    const shibiaSource = apiFeatured.find((resource) =>
      (resource.title ?? "").toLowerCase().includes("shib")
    );

    const sorted = shibiaSource
      ? [
          normalizeResource(shibiaSource, 0, "Shibuya Crossing"),
          ...apiFeatured
            .filter((resource) => resource.id !== shibiaSource.id)
            .map((resource, index) => normalizeResource(resource, index + 1)),
        ]
      : apiFeatured.map((resource, index) => normalizeResource(resource, index));

    return sorted.slice(0, 5);
  }, [featuredQuery.data]);

  return (
    <main className="relative z-[2] min-h-screen bg-background">
      <section
        ref={heroReplayRef}
        className="relative flex h-[100vh] min-h-[720px] items-end overflow-hidden bg-primary"
      >
        <div
          key={`${season.key}-${heroReplayKey}`}
          className={`homepage-season-image homepage-season-image-${season.key} absolute inset-0`}
          style={{ backgroundImage: `url('${season.image}')` }}
        />
        <div
          key={`motion-${season.key}-${heroReplayKey}`}
          className={`homepage-season-motion homepage-season-motion-${season.key}`}
        />
        <div
          key={`detail-${season.key}-${heroReplayKey}`}
          className={`homepage-season-detail homepage-season-detail-${season.key}`}
        />
        <SeasonalParticleCanvas
          key={`particles-${season.key}-${heroReplayKey}`}
          seasonKey={season.key}
        />

        <svg
          aria-hidden
          className="homepage-wave pointer-events-none absolute inset-0 z-[2] h-full w-full opacity-60 mix-blend-soft-light"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1440 900"
        >
          <defs>
            <linearGradient id="waveGrad" x1="0" x2="1" y1="0" y2="1">
              <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
              <stop offset="100%" stopColor="rgba(255,255,255,0)" />
            </linearGradient>
          </defs>
          <path className="homepage-wave-path-a" fill="none" stroke="url(#waveGrad)" strokeWidth="1.2" />
          <path className="homepage-wave-path-b" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1" />
        </svg>

        <div className="absolute inset-0 z-[3] bg-gradient-to-b from-primary/10 via-primary/28 to-primary/90" />
        <div className="absolute inset-0 z-[3] bg-gradient-to-r from-primary/78 via-primary/22 to-transparent" />

        <div
          className="absolute top-4 left-6 right-6 z-10 flex items-start justify-between text-white/70 lg:left-10 lg:right-10"
          style={{ fontSize: "0.7rem", letterSpacing: "0.25em" }}
        >
          <div className="flex items-center gap-3">
            <span className="h-px w-8 bg-white/40" />
            <span className="uppercase">{season.issue}</span>
          </div>
          <div className="hidden items-center gap-3 md:flex">
            <span className="uppercase">{season.coords}</span>
            <span className="h-px w-8 bg-white/40" />
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-[1400px] px-6 pb-20 lg:px-10 lg:pb-28">
          <div className="grid grid-cols-12 items-end gap-6">
            <div
              key={`hero-copy-${heroReplayKey}`}
              className="homepage-enter col-span-12 lg:col-span-8"
            >
              <div className="mb-8 flex items-center gap-3">
                <span className="h-px w-12 bg-accent" />
                <span
                  className="uppercase tracking-[0.35em] text-white/90"
                  style={{ fontSize: "0.72rem", fontWeight: 500 }}
                >
                  An Editorial Heritage Archive
                </span>
              </div>

              <h1
                className="font-serif text-white"
                style={{
                  fontSize: "clamp(3rem, 7.5vw, 6.5rem)",
                  fontWeight: 600,
                  lineHeight: 0.95,
                  letterSpacing: "-0.02em",
                }}
              >
                Discover &amp; Preserve
                <br />
                <span className="font-light italic text-accent">
                  Cultural Heritage
                </span>
              </h1>

              <p
                className="mt-10 max-w-xl text-white/80"
                style={{ fontSize: "1.125rem", lineHeight: 1.75 }}
              >
                A collaborative archive for images, oral histories, traditions,
                and educational materials, curated by a global community of
                researchers, archivists, and storytellers.
              </p>

              <div className="mt-12 flex flex-wrap items-center gap-4">
                <Link
                  href={isAuthenticated ? "/browse" : "/register"}
                  className="homepage-cta group inline-flex items-center gap-3 rounded-full bg-accent px-8 py-4 text-white shadow-2xl transition-all duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                  style={{
                    fontSize: "1rem",
                    fontWeight: 500,
                    letterSpacing: "0.02em",
                  }}
                >
                  Get Started
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/20 transition-transform duration-300 group-hover:rotate-45">
                    <ArrowUpRight className="h-3.5 w-3.5" />
                  </span>
                </Link>

                {!isAuthenticated && (
                  <Link
                    href="/login"
                    className="rounded-full border border-white/30 px-6 py-4 text-white transition-all duration-300 hover:-translate-y-1 hover:border-white/70 hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white"
                    style={{ fontSize: "1rem", fontWeight: 500 }}
                  >
                    Sign In
                  </Link>
                )}
              </div>
            </div>

            <div
              key={`hero-stats-${heroReplayKey}`}
              className="homepage-enter hidden text-white lg:col-span-4 lg:block"
            >
              <div className="space-y-8 border-l border-white/20 pl-8">
                <div>
                  <div
                    className="mb-2 uppercase tracking-[0.3em] text-white/50"
                    style={{ fontSize: "0.65rem" }}
                  >
                    Currently in archive
                  </div>
                  <div
                    className="font-serif"
                    style={{ fontSize: "2.75rem", fontWeight: 500, lineHeight: 1 }}
                  >
                    {formatStat(statsQuery.data?.resourceCount)}
                  </div>
                  <div className="mt-1 text-white/60" style={{ fontSize: "0.85rem" }}>
                    resources curated
                  </div>
                </div>
                <div className="h-px bg-white/15" />
                <div>
                  <div
                    className="mb-2 uppercase tracking-[0.3em] text-white/50"
                    style={{ fontSize: "0.65rem" }}
                  >
                    Contributing users
                  </div>
                  <div
                    className="font-serif"
                    style={{ fontSize: "2.75rem", fontWeight: 500, lineHeight: 1 }}
                  >
                    {formatStat(statsQuery.data?.userCount)}
                  </div>
                  <div className="mt-1 text-white/60" style={{ fontSize: "0.85rem" }}>
                    archivists & storytellers
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className="absolute bottom-6 left-6 right-6 z-10 flex items-end justify-between text-white/60 lg:left-10 lg:right-10"
          style={{ fontSize: "0.72rem", letterSpacing: "0.2em" }}
        >
          <div className="hidden max-w-xs uppercase leading-relaxed md:block">
            {season.plate} - {season.caption}
            <br />
            {season.note}
          </div>
          <div className="flex flex-col items-center gap-3">
            <span className="uppercase">Scroll</span>
            <div className="homepage-scroll-cue h-12 w-px bg-white/40" />
          </div>
          <div className="hidden items-center gap-3 md:flex">
            {seasons.map((item, index) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setActiveSeason(index)}
                aria-label={`Show ${item.label} scene`}
                className="group flex items-center gap-2 focus-visible:outline-none"
              >
                <span
                  className={`h-px transition-all duration-500 ${
                    index === activeSeason ? "w-10 bg-accent" : "w-5 bg-white/25"
                  }`}
                />
                <span
                  className={`uppercase transition-colors duration-300 ${
                    index === activeSeason
                      ? "text-white"
                      : "text-white/35 group-hover:text-white/70"
                  }`}
                >
                  {item.label}
                </span>
              </button>
            ))}
            <span className="ml-2 uppercase text-white/40">{season.year}</span>
          </div>
        </div>
      </section>

      <section className="overflow-hidden border-y border-white/10 bg-primary py-4 text-primary-foreground">
        <div className="homepage-marquee flex whitespace-nowrap font-serif italic text-white/75">
          {Array.from({ length: 2 }).map((_, index) => (
            <div key={index} className="flex shrink-0 items-center gap-8 pr-8">
              {[
                "Historical Sites",
                "Traditional Crafts",
                "Oral Traditions",
                "Festivals & Ceremonies",
                "Architecture",
                "Educational Materials",
              ].map((item) => (
                <span key={`${index}-${item}`} style={{ fontSize: "1.5rem" }}>
                  {item}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      <section className="bg-white">
        <div className="mx-auto grid max-w-[1400px] gap-px bg-border sm:grid-cols-3">
          {[
            {
              num: "01",
              icon: Archive,
              title: "Preserve Evidence",
              text: "Upload images, documents, oral histories, and supporting context with archival clarity.",
              hoverClass: "hover:bg-[#071426]",
              iconClass: "border-[#285768]/35 text-[#3f6f7d]",
              effectClass: "homepage-feature-card-sea",
            },
            {
              num: "02",
              icon: Heart,
              title: "Curate With Care",
              text: "Community reviewers protect attribution, accuracy, and publication quality before records go live.",
              hoverClass: "",
              iconClass: "border-[#A86F66]/40 text-[#8C5B54]",
              effectClass: "homepage-feature-card-rose",
            },
            {
              num: "03",
              icon: Compass,
              title: "Open Discovery",
              text: "Browse featured collections, categories, and places through an editorial museum-style archive.",
              hoverClass: "",
              iconClass: "border-[#7F9688]/40 text-[#667C6F]",
              effectClass: "homepage-feature-card-jade",
            },
          ].map((item) => (
            <div
              key={item.title}
              className={`group relative overflow-hidden bg-white p-10 transition-colors duration-500 hover:text-white lg:p-12 ${item.hoverClass} ${item.effectClass}`}
            >
              {item.effectClass ? (
                <div className="homepage-feature-card-field" aria-hidden="true">
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              ) : null}
              <div className="relative z-10 mb-10 flex items-start justify-between">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-full border bg-white/70 transition-colors duration-500 group-hover:border-white/35 group-hover:bg-white/15 ${item.iconClass}`}
                >
                  <item.icon className="h-5 w-5 transition-colors duration-500 group-hover:text-white" />
                </div>
                <span
                  className="font-serif italic text-muted-foreground transition-colors duration-500 group-hover:text-white/65"
                  style={{ fontSize: "1.5rem" }}
                >
                  {item.num}
                </span>
              </div>
              <h3 className="relative z-10 mb-4 font-serif" style={{ fontSize: "1.875rem", fontWeight: 500, letterSpacing: "-0.01em" }}>
                {item.title}
              </h3>
              <p
                className="relative z-10 text-muted-foreground transition-colors duration-500 group-hover:text-white/78"
                style={{ lineHeight: 1.75, fontSize: "0.95rem" }}
              >
                {item.text}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section
        ref={quoteReplayRef}
        className="relative overflow-hidden bg-background py-28 lg:py-40"
      >
        <div
          key={`quote-${quoteReplayKey}`}
          className="homepage-quote-enter relative mx-auto max-w-[1100px] px-6 text-center lg:px-10"
        >
          <Quote className="mx-auto mb-10 h-10 w-10 text-accent" strokeWidth={1.5} />
          <blockquote
            className="font-serif text-foreground"
            style={{
              fontSize: "clamp(1.5rem, 3.2vw, 2.75rem)",
              fontWeight: 400,
              lineHeight: 1.3,
              letterSpacing: "-0.005em",
            }}
          >
            &ldquo;Heritage is not the marble of the past, it is the
            <span className="italic text-accent"> living conversation </span>
            between what we remember, what we preserve, and what we choose to
            pass on.&rdquo;
          </blockquote>
          <div
            className="mt-12 flex items-center justify-center gap-4 uppercase tracking-[0.3em] text-muted-foreground"
            style={{ fontSize: "0.72rem" }}
          >
            <span className="h-px w-10 bg-muted-foreground/40" />
            <span>From the editorial charter</span>
            <span className="h-px w-10 bg-muted-foreground/40" />
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/40 py-28">
        <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
          <div className="mb-20 flex flex-col gap-8 md:flex-row md:items-end md:justify-between">
            <div className="max-w-2xl">
              <span
                className="uppercase tracking-[0.35em] text-accent"
                style={{ fontSize: "0.72rem", fontWeight: 500 }}
              >
                - The Collection / 2026
              </span>
              <h2
                className="mt-5 mb-6 font-serif"
                style={{
                  fontSize: "clamp(2.25rem, 4.5vw, 4rem)",
                  fontWeight: 500,
                  lineHeight: 1.05,
                  letterSpacing: "-0.015em",
                }}
              >
                Featured <span className="italic text-muted-foreground">Resources.</span>
              </h2>
              <p
                className="text-muted-foreground"
                style={{ fontSize: "1.0625rem", lineHeight: 1.7 }}
              >
                Five essays from this season&apos;s collection, selected by our
                editors for depth of research, visual clarity, and contribution
                to the wider field of heritage scholarship.
              </p>
            </div>

            <Link
              href="/browse"
              className="group inline-flex items-center gap-3 self-start whitespace-nowrap text-foreground transition-colors hover:text-accent md:self-auto"
              style={{ fontSize: "0.95rem", fontWeight: 500 }}
            >
              <span className="border-b border-foreground/30 pb-1 transition-colors group-hover:border-accent">
                Browse Resources
              </span>
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-foreground/20 transition-all duration-300 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-white">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>

          {featuredResources.length > 0 ? (
            <div className="space-y-8">
              <LeadResource
                resource={featuredResources[0]}
                hoveredCard={hoveredCard}
                setHoveredCard={setHoveredCard}
              />

              {featuredResources.length > 1 && (
                <div className="grid grid-cols-1 gap-8 border-t border-border pt-8 md:grid-cols-2">
                  {featuredResources.slice(1).map((resource) => (
                    <FeatureTile
                      key={resource.id}
                      resource={resource}
                      hoveredCard={hoveredCard}
                      setHoveredCard={setHoveredCard}
                    />
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-white p-10 text-center shadow-[var(--shadow-heritage-card)]">
              <p className="font-serif text-2xl">No featured resources yet.</p>
              <p className="mt-2 text-muted-foreground">
                Approved featured resources will appear here as soon as they are
                available from the archive.
              </p>
            </div>
          )}
        </div>
      </section>

      {featuredQuery.isError && (
        <p className="sr-only">
          Featured resources could not be loaded from the API.
        </p>
      )}
    </main>
  );
}

function LeadResource({
  resource,
  hoveredCard,
  setHoveredCard,
}: {
  resource: HomeResource;
  hoveredCard: string | null;
  setHoveredCard: (id: string | null) => void;
}) {
  const isHover = hoveredCard === resource.id;
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : resource.image;

  return (
    <Link
      href={getResourceHref(resource)}
      onMouseEnter={() => setHoveredCard(resource.id)}
      onMouseLeave={() => setHoveredCard(null)}
      className="group block"
    >
      <article className="grid grid-cols-1 items-stretch gap-8 lg:grid-cols-12 lg:gap-12">
        <div
          className={`relative overflow-hidden rounded-2xl bg-muted transition-all duration-500 lg:col-span-7 lg:h-[560px] ${
            isHover ? "-translate-y-1.5 shadow-[0_32px_64px_rgba(20,28,50,0.22)]" : "shadow-[0_8px_24px_rgba(20,28,50,0.08)]"
          }`}
        >
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={resource.title}
              className={`h-full w-full object-cover transition-transform duration-1000 ${isHover ? "scale-105" : ""}`}
              onError={() => setImageFailed(true)}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-secondary">
              <Archive className="size-12 text-muted-foreground/50" />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-primary/40 via-transparent to-transparent" />
          <div className="absolute top-6 left-6 flex items-center gap-3">
            <span
              className="rounded-full bg-white/95 px-3.5 py-1.5 text-primary backdrop-blur"
              style={{ fontSize: "0.72rem", fontWeight: 500, letterSpacing: "0.08em" }}
            >
              {resource.category.toUpperCase()}
            </span>
            <span
              className="rounded-full bg-accent px-3 py-1.5 tracking-[0.15em] text-white"
              style={{ fontSize: "0.7rem", fontWeight: 500 }}
            >
              LEAD ESSAY
            </span>
          </div>
        </div>

        <div className="flex flex-col justify-between py-2 lg:col-span-5">
          <div>
            <div
              className="mb-6 flex items-baseline gap-4 text-muted-foreground"
              style={{ fontSize: "0.8rem", letterSpacing: "0.25em" }}
            >
              <span className="font-serif italic text-accent" style={{ fontSize: "2.5rem", letterSpacing: "0", lineHeight: 1 }}>
                {resource.index}
              </span>
              <span className="uppercase">- Plate I / {resource.year}</span>
            </div>
            <h3
              className="font-serif transition-colors duration-500 group-hover:text-accent"
              style={{
                fontSize: "clamp(1.875rem, 3.5vw, 2.75rem)",
                fontWeight: 500,
                lineHeight: 1.1,
                letterSpacing: "-0.01em",
              }}
            >
              {resource.title}
            </h3>
            <div className="mt-4 flex items-center gap-2 text-muted-foreground" style={{ fontSize: "0.9rem" }}>
              <MapPin className="h-3.5 w-3.5" />
              <span>{resource.place}</span>
            </div>
            <p className="mt-6 max-w-md text-foreground/75" style={{ fontSize: "1.0625rem", lineHeight: 1.75 }}>
              {resource.excerpt}
            </p>
          </div>

          <div className="mt-10 flex items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-border bg-white px-3.5 py-1.5 text-foreground/80"
                  style={{ fontSize: "0.78rem" }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-full border border-foreground/20 transition-all duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent group-hover:text-white">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

function FeatureTile({
  resource,
  hoveredCard,
  setHoveredCard,
}: {
  resource: HomeResource;
  hoveredCard: string | null;
  setHoveredCard: (id: string | null) => void;
}) {
  const isHover = hoveredCard === resource.id;
  const [imageFailed, setImageFailed] = useState(false);
  const imageUrl = imageFailed ? null : resource.image;

  return (
    <Link
      href={getResourceHref(resource)}
      onMouseEnter={() => setHoveredCard(resource.id)}
      onMouseLeave={() => setHoveredCard(null)}
      className="group block"
    >
      <article
        className={`relative aspect-[16/10] overflow-hidden rounded-2xl bg-muted transition-all duration-500 ${
          isHover ? "-translate-y-2 shadow-[0_28px_56px_rgba(20,28,50,0.2)]" : "shadow-[0_6px_18px_rgba(20,28,50,0.07)]"
        }`}
      >
        {imageUrl ? (
          <img
            src={imageUrl}
            alt={resource.title}
            className={`absolute inset-0 h-full w-full object-cover transition-transform duration-1000 ${isHover ? "scale-105" : ""}`}
            onError={() => setImageFailed(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center bg-primary">
            <Archive className="size-10 text-white/25" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-primary/85 via-primary/30 to-transparent" />

        <div className="absolute top-5 left-5 right-5 flex items-start justify-between text-white">
          <span
            className="rounded-full border border-white/20 bg-white/15 px-3 py-1.5 backdrop-blur-md"
            style={{ fontSize: "0.7rem", fontWeight: 500, letterSpacing: "0.08em" }}
          >
            {resource.category.toUpperCase()}
          </span>
          <span className="font-serif italic" style={{ fontSize: "1.5rem", lineHeight: 1 }}>
            {resource.index}
          </span>
        </div>

        <div className="absolute inset-x-0 bottom-0 p-7 text-white">
          <div
            className="mb-3 flex items-center gap-2 text-white/70"
            style={{ fontSize: "0.78rem", letterSpacing: "0.15em" }}
          >
            <MapPin className="h-3 w-3" />
            <span className="uppercase">{resource.place}</span>
            <span className="text-white/40">/</span>
            <span className="uppercase">{resource.year}</span>
          </div>
          <h3
            className="mb-3 font-serif"
            style={{
              fontSize: "1.875rem",
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: "-0.01em",
            }}
          >
            {resource.title}
          </h3>

          <div
            className={`overflow-hidden transition-all duration-500 ${
              isHover ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
            }`}
          >
            <p className="mb-5 max-w-md text-white/85" style={{ fontSize: "0.95rem", lineHeight: 1.65 }}>
              {resource.excerpt}
            </p>
          </div>

          <div className="flex items-end justify-between">
            <div className="flex flex-wrap gap-2">
              {resource.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-white backdrop-blur-md"
                  style={{ fontSize: "0.72rem" }}
                >
                  {tag}
                </span>
              ))}
            </div>
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-white/30 transition-all duration-500 group-hover:rotate-45 group-hover:border-accent group-hover:bg-accent">
              <ArrowUpRight className="h-4 w-4" />
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}

type SeasonalParticle = {
  x: number;
  y: number;
  z: number;
  size: number;
  speed: number;
  wind: number;
  gust: number;
  sway: number;
  phase: number;
  phaseB: number;
  wobbleRate: number;
  wobbleRateB: number;
  rotation: number;
  rotationSpeed: number;
  opacity: number;
  tint: number;
  blur: number;
};

type ParticleConfig = {
  minCount: number;
  maxCount: number;
  countWidthDivisor: number;
  reducedCount: number;
  size: [number, number];
  speed: [number, number];
  wind: [number, number];
  opacity: [number, number];
  blur: [number, number];
  sway: [number, number];
  gust: [number, number];
  mixBlend: CSSProperties["mixBlendMode"];
};

const particleConfigs: Record<SeasonKey, ParticleConfig> = {
  spring: {
    minCount: 30,
    maxCount: 58,
    countWidthDivisor: 27,
    reducedCount: 20,
    size: [3.2, 6.3],
    speed: [15, 34],
    wind: [8, 30],
    opacity: [0.48, 0.84],
    blur: [0, 0.52],
    sway: [7, 24],
    gust: [4, 18],
    mixBlend: "screen",
  },
  summer: {
    minCount: 30,
    maxCount: 58,
    countWidthDivisor: 27,
    reducedCount: 20,
    size: [3.0, 5.9],
    speed: [15, 34],
    wind: [8, 30],
    opacity: [0.42, 0.8],
    blur: [0.18, 0.78],
    sway: [7, 24],
    gust: [4, 18],
    mixBlend: "screen",
  },
  autumn: {
    minCount: 30,
    maxCount: 58,
    countWidthDivisor: 27,
    reducedCount: 20,
    size: [3.1, 6.1],
    speed: [15, 34],
    wind: [8, 30],
    opacity: [0.44, 0.8],
    blur: [0, 0.5],
    sway: [7, 24],
    gust: [4, 18],
    mixBlend: "soft-light",
  },
  winter: {
    minCount: 34,
    maxCount: 64,
    countWidthDivisor: 25,
    reducedCount: 24,
    size: [1.8, 4.8],
    speed: [9, 24],
    wind: [-6, 8],
    opacity: [0.32, 0.78],
    blur: [0.12, 1.15],
    sway: [5, 16],
    gust: [1, 7],
    mixBlend: "screen",
  },
};

function SeasonalParticleCanvas({ seasonKey }: { seasonKey: SeasonKey }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const context = canvas.getContext("2d");
    if (!context) return;
    const petalCanvas = canvas;
    const ctx = context;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frameId = 0;
    let lastTime = performance.now();
    let paused = false;
    let particles: SeasonalParticle[] = [];
    const config = particleConfigs[seasonKey];

    const random = (min: number, max: number) =>
      min + Math.random() * (max - min);

    function createParticle(initial = false): SeasonalParticle {
      const z = Math.random();
      const size = random(config.size[0], config.size[1]) + z * 1.6;

      return {
        x: random(-width * 0.2, width * 1.08),
        y: initial
          ? random(-height * 0.18, height * 1.08)
          : random(-height * 0.24, -20),
        z,
        size,
        speed: random(config.speed[0], config.speed[1]) + z * 18,
        wind: random(config.wind[0], config.wind[1]) + z * 18,
        gust: random(config.gust[0], config.gust[1]),
        sway: random(config.sway[0], config.sway[1]) + z * 12,
        phase: random(0, Math.PI * 2),
        phaseB: random(0, Math.PI * 2),
        wobbleRate: random(0.45, 1.8),
        wobbleRateB: random(0.22, 1.15),
        rotation: random(0, Math.PI * 2),
        rotationSpeed: random(-1.7, 1.7) * (0.35 + z),
        opacity: random(config.opacity[0], config.opacity[1]),
        tint: Math.random(),
        blur: random(config.blur[0], config.blur[1]) * (0.5 + z),
      };
    }

    function resize() {
      const rect = petalCanvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 1.35);

      petalCanvas.width = Math.max(1, Math.floor(width * dpr));
      petalCanvas.height = Math.max(1, Math.floor(height * dpr));
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const targetCount = reducedMotion.matches
        ? config.reducedCount
        : Math.min(
            config.maxCount,
            Math.max(config.minCount, Math.floor(width / config.countWidthDivisor))
          );
      particles = Array.from({ length: targetCount }, () => createParticle(true));
    }

    function drawSpringPetal(particle: SeasonalParticle, time: number) {
      const flutter = Math.sin(time * 0.002 + particle.phase);
      const flip = 0.55 + Math.abs(Math.sin(time * 0.003 + particle.phaseB)) * 0.7;
      const s = particle.size;

      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation + flutter * 0.45);
      ctx.scale(flip, 1);
      ctx.filter = particle.blur > 0.28 && particle.z > 0.72
        ? `blur(${particle.blur}px)`
        : "none";

      ctx.fillStyle = particle.tint > 0.55
        ? "rgba(255, 198, 218, 0.92)"
        : "rgba(255, 238, 246, 0.94)";
      ctx.strokeStyle = "rgba(255, 255, 255, 0.48)";
      ctx.lineWidth = 0.45;

      ctx.beginPath();
      ctx.moveTo(0, -s * 0.95);
      ctx.bezierCurveTo(s * 0.72, -s * 0.58, s * 0.68, s * 0.42, 0, s);
      ctx.bezierCurveTo(-s * 0.62, s * 0.34, -s * 0.72, -s * 0.55, 0, -s * 0.95);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = particle.opacity * 0.5;
      ctx.fillStyle = "rgba(255, 214, 132, 0.72)";
      ctx.beginPath();
      ctx.arc(0, s * 0.2, Math.max(0.45, s * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawSummerMote(particle: SeasonalParticle) {
      const radius = particle.size * (0.26 + particle.z * 0.16);
      const glow = radius * (2.5 + particle.z * 1.2);
      const streak = particle.size * (0.7 + particle.z * 0.5);

      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation * 0.45);
      ctx.filter = particle.z > 0.72 ? `blur(${particle.blur}px)` : "none";
      const gradient = ctx.createRadialGradient(
        0,
        0,
        0,
        0,
        0,
        glow
      );
      gradient.addColorStop(0, "rgba(255, 246, 184, 0.88)");
      gradient.addColorStop(0.36, "rgba(255, 210, 94, 0.4)");
      gradient.addColorStop(1, "rgba(255, 204, 105, 0)");
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(0, 0, glow, 0, Math.PI * 2);
      ctx.fill();

      ctx.filter = "none";
      ctx.strokeStyle = "rgba(255, 246, 196, 0.58)";
      ctx.lineWidth = Math.max(0.45, radius * 0.38);
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(-streak * 0.28, -streak * 0.12);
      ctx.lineTo(streak * 0.28, streak * 0.12);
      ctx.stroke();

      ctx.fillStyle = particle.tint > 0.5
        ? "rgba(255, 249, 216, 0.86)"
        : "rgba(255, 220, 122, 0.78)";
      ctx.beginPath();
      ctx.arc(0, 0, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawAutumnMaple(particle: SeasonalParticle) {
      const s = particle.size * 1.08;
      const leafPoints: [number, number][] = [
        [0, -1.12],
        [-0.08, -0.82],
        [-0.18, -0.98],
        [-0.2, -0.68],
        [-0.36, -0.9],
        [-0.34, -0.58],
        [-0.56, -0.75],
        [-0.46, -0.46],
        [-0.78, -0.5],
        [-0.55, -0.28],
        [-0.86, -0.18],
        [-0.54, -0.1],
        [-0.68, 0.14],
        [-0.38, 0.04],
        [-0.4, 0.3],
        [-0.18, 0.18],
        [-0.08, 0.42],
        [0, 0.24],
        [0.08, 0.42],
        [0.18, 0.18],
        [0.4, 0.3],
        [0.38, 0.04],
        [0.68, 0.14],
        [0.54, -0.1],
        [0.86, -0.18],
        [0.55, -0.28],
        [0.78, -0.5],
        [0.46, -0.46],
        [0.56, -0.75],
        [0.34, -0.58],
        [0.36, -0.9],
        [0.2, -0.68],
        [0.18, -0.98],
        [0.08, -0.82],
      ];

      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.filter = particle.blur > 0.25 && particle.z > 0.75
        ? `blur(${particle.blur}px)`
        : "none";
      ctx.fillStyle = particle.tint > 0.66
        ? "rgba(190, 63, 35, 0.88)"
        : particle.tint > 0.33
          ? "rgba(225, 46, 42, 0.86)"
          : "rgba(242, 105, 54, 0.82)";
      ctx.strokeStyle = "rgba(116, 25, 28, 0.32)";
      ctx.lineWidth = 0.36;

      ctx.beginPath();
      leafPoints.forEach(([x, y], index) => {
        if (index === 0) {
          ctx.moveTo(x * s, y * s);
        } else {
          ctx.lineTo(x * s, y * s);
        }
      });
      ctx.closePath();
      ctx.fill();
      ctx.stroke();

      const veinOriginY = s * 0.22;

      ctx.globalAlpha = particle.opacity * 0.5;
      ctx.strokeStyle = "rgba(255, 176, 132, 0.58)";
      ctx.lineWidth = 0.34;
      ctx.beginPath();
      ctx.moveTo(0, veinOriginY);
      ctx.lineTo(0, -s * 0.92);
      [
        [-0.18, -0.8],
        [-0.36, -0.7],
        [-0.58, -0.48],
        [-0.66, -0.16],
        [-0.28, 0.16],
        [0.28, 0.16],
        [0.66, -0.16],
        [0.58, -0.48],
        [0.36, -0.7],
        [0.18, -0.8],
      ].forEach(([x, y]) => {
        ctx.moveTo(0, veinOriginY);
        ctx.lineTo(x * s, y * s);
      });
      ctx.stroke();

      ctx.globalAlpha = particle.opacity * 0.64;
      ctx.strokeStyle = "rgba(126, 16, 38, 0.62)";
      ctx.lineWidth = 0.55;
      ctx.beginPath();
      ctx.moveTo(0, s * 0.24);
      ctx.bezierCurveTo(-s * 0.03, s * 0.44, -s * 0.05, s * 0.66, -s * 0.08, s * 0.94);
      ctx.stroke();
      ctx.restore();
    }

    function drawWinterSnow(particle: SeasonalParticle) {
      const s = particle.size;
      const crystalline = particle.z > 0.78 && particle.tint > 0.58;

      ctx.save();
      ctx.globalAlpha = particle.opacity;
      ctx.translate(particle.x, particle.y);
      ctx.rotate(particle.rotation);
      ctx.filter = particle.blur > 0.4 && particle.z > 0.74
        ? `blur(${particle.blur}px)`
        : "none";

      if (!crystalline) {
        const radius = Math.max(0.7, s * (0.28 + particle.z * 0.2));
        const glow = radius * (2.4 + particle.z * 1.8);
        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, glow);
        gradient.addColorStop(0, "rgba(255, 255, 255, 0.92)");
        gradient.addColorStop(0.38, "rgba(235, 249, 255, 0.52)");
        gradient.addColorStop(1, "rgba(235, 249, 255, 0)");

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, glow, 0, Math.PI * 2);
        ctx.fill();

        ctx.filter = "none";
        ctx.globalAlpha = particle.opacity * 0.74;
        ctx.fillStyle = "rgba(249, 253, 255, 0.86)";
        ctx.beginPath();
        ctx.arc(0, 0, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      ctx.globalAlpha = particle.opacity * 0.7;
      ctx.strokeStyle = "rgba(246, 253, 255, 0.84)";
      ctx.lineWidth = Math.max(0.36, s * 0.075);
      ctx.lineCap = "round";
      ctx.lineJoin = "round";

      for (let i = 0; i < 6; i += 1) {
        ctx.save();
        ctx.rotate((Math.PI * 2 * i) / 6);

        ctx.beginPath();
        ctx.moveTo(0, 0);
        ctx.lineTo(0, -s * 0.88);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, -s * 0.48);
        ctx.lineTo(-s * 0.14, -s * 0.64);
        ctx.moveTo(0, -s * 0.48);
        ctx.lineTo(s * 0.14, -s * 0.64);
        ctx.moveTo(0, -s * 0.68);
        ctx.lineTo(-s * 0.1, -s * 0.8);
        ctx.moveTo(0, -s * 0.68);
        ctx.lineTo(s * 0.1, -s * 0.8);
        ctx.stroke();

        ctx.restore();
      }

      ctx.globalAlpha = particle.opacity * 0.42;
      ctx.strokeStyle = "rgba(216, 243, 255, 0.42)";
      ctx.lineWidth = Math.max(0.3, s * 0.05);
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.36, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = "rgba(255, 255, 255, 0.86)";
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.45, s * 0.1), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    function drawParticle(particle: SeasonalParticle, time: number) {
      if (seasonKey === "spring") {
        drawSpringPetal(particle, time);
      } else if (seasonKey === "summer") {
        drawSummerMote(particle);
      } else if (seasonKey === "autumn") {
        drawAutumnMaple(particle);
      } else {
        drawWinterSnow(particle);
      }
    }

    function resetParticle(particle: SeasonalParticle) {
      Object.assign(particle, createParticle(false));
      particle.x = random(-width * 0.22, width * 0.72);
    }

    function animate(now: number) {
      if (paused) {
        lastTime = now;
        frameId = window.requestAnimationFrame(animate);
        return;
      }

      const delta = Math.min(48, now - lastTime) / 1000;
      lastTime = now;

      ctx.clearRect(0, 0, width, height);

      for (const particle of particles) {
        particle.phase += delta * particle.wobbleRate;
        particle.phaseB += delta * particle.wobbleRateB;
        particle.rotation += particle.rotationSpeed * delta;

        const gust =
          Math.sin(now * 0.00034 + particle.phaseB) * particle.gust +
          Math.sin(now * 0.00017 + particle.phase + particle.y * 0.012) *
            particle.gust *
            0.55;

        particle.x +=
          (particle.wind + gust + Math.sin(particle.phase) * particle.sway * 0.08) *
          delta;
        particle.y +=
          (particle.speed + Math.cos(particle.phaseB) * particle.sway * 0.08) *
          delta;

        const displayX =
          particle.x +
          Math.sin(particle.phase) * particle.sway +
          Math.sin(particle.phaseB * 1.37) * particle.sway * 0.45;
        const displayY =
          particle.y + Math.cos(particle.phaseB) * particle.sway * 0.18;

        const savedX = particle.x;
        const savedY = particle.y;
        particle.x = displayX;
        particle.y = displayY;
        drawParticle(particle, now);
        particle.x = savedX;
        particle.y = savedY;

        const outOfBounds =
          particle.y > height + 42 || particle.x > width + 96;

        if (outOfBounds) {
          resetParticle(particle);
        }
      }

      frameId = window.requestAnimationFrame(animate);
    }

    resize();
    window.addEventListener("resize", resize);
    const handleVisibilityChange = () => {
      paused = document.hidden;
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    frameId = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [seasonKey]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-[6] h-full w-full"
      style={{ mixBlendMode: particleConfigs[seasonKey].mixBlend }}
    />
  );
}
