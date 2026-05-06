"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Archive } from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import type { UserRole } from "@/types";

type FooterLink = {
  label: string;
  href: string;
  roles?: UserRole[];
};

const archiveLinks: FooterLink[] = [
  { label: "Browse Resources", href: "/browse" },
  { label: "Featured Collections", href: "/featured" },
  { label: "Categories & Tags", href: "/browse" },
];

const communityLinks: FooterLink[] = [
  { label: "Browse Comments", href: "/my-comments" },
  { label: "Contributor Profiles", href: "/browse" },
  {
    label: "Add Draft",
    href: "/contribute/new",
    roles: ["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"],
  },
];

const officeLinks: FooterLink[] = [
  {
    label: "My Resources",
    href: "/contribute",
    roles: ["CONTRIBUTOR", "REVIEWER", "ADMINISTRATOR"],
  },
  {
    label: "Review Page",
    href: "/review",
    roles: ["REVIEWER", "ADMINISTRATOR"],
  },
  {
    label: "Admin Panel",
    href: "/admin/users",
    roles: ["ADMINISTRATOR"],
  },
];

function canOpen(userRole: UserRole | undefined, roles?: UserRole[]) {
  if (!roles) return true;
  if (!userRole) return false;
  return userRole === "ADMINISTRATOR" || roles.includes(userRole);
}

function FooterColumn({
  title,
  links,
}: {
  title: string;
  links: FooterLink[];
}) {
  const router = useRouter();
  const { user } = useAuth();

  function handleRestrictedClick() {
    router.push("/#site-footer");
  }

  return (
    <div className="md:col-span-2">
      <div
        className="mb-4 text-primary-foreground/40 uppercase tracking-[0.25em]"
        style={{ fontSize: "0.7rem" }}
      >
        {title}
      </div>
      <ul
        className="space-y-2.5 whitespace-nowrap text-primary-foreground/80"
        style={{ fontSize: "0.95rem" }}
      >
        {links.map((link) => {
          const allowed = canOpen(user?.role, link.roles);

          return (
            <li key={`${title}-${link.label}`}>
              {allowed ? (
                <Link
                  href={link.href}
                  className="transition-colors hover:text-accent"
                >
                  {link.label}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleRestrictedClick}
                  className="transition-colors hover:text-accent"
                >
                  {link.label}
                </button>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function SiteFooter() {
  return (
    <footer
      id="site-footer"
      className="relative z-[2] bg-primary pt-20 pb-10 text-primary-foreground"
    >
      <div className="mx-auto max-w-[1400px] px-6 lg:px-10">
        <div className="grid grid-cols-1 gap-10 border-b border-white/10 pb-16 md:grid-cols-12">
          <div className="md:col-span-6">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full border border-accent/40">
                <Archive className="h-4 w-4 text-accent" />
              </div>
              <span
                className="font-serif"
                style={{ fontSize: "1.25rem", fontWeight: 600 }}
              >
                Heritage Platform
              </span>
            </div>
            <p
              className="max-w-md text-primary-foreground/65"
              style={{ fontSize: "1rem", lineHeight: 1.7 }}
            >
              A collaborative editorial archive for cultural heritage, published
              in seasonal collections and stewarded by an international
              community of contributors.
            </p>
          </div>

          <FooterColumn title="Archive" links={archiveLinks} />
          <FooterColumn title="Community" links={communityLinks} />
          <FooterColumn title="Office" links={officeLinks} />
        </div>

        <div
          className="flex flex-col items-start justify-between gap-4 pt-8 text-primary-foreground/50 md:flex-row md:items-center"
          style={{ fontSize: "0.8rem", letterSpacing: "0.1em" }}
        >
          <span className="uppercase">
            MMXXVI Heritage Platform / All rights reserved
          </span>
          <span
            className="font-serif italic"
            style={{ fontSize: "0.95rem", letterSpacing: "0" }}
          >
            Preserving cultural heritage for future generations.
          </span>
        </div>
      </div>
    </footer>
  );
}
