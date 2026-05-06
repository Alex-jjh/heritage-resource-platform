"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
  { href: "/admin/users", label: "Users" },
  { href: "/admin/categories", label: "Categories" },
  { href: "/admin/tags", label: "Tags" },
  { href: "/admin/archived", label: "Archived" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <div className="mb-8">
      <nav className="border-b border-border">
        <div className="flex flex-wrap gap-2 overflow-x-auto">
          {TABS.map((tab) => {
            const active = pathname === tab.href;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-medium transition-colors whitespace-nowrap ${
                  active
                    ? "border-accent text-foreground"
                    : "border-transparent text-foreground/60 hover:border-muted-foreground/30 hover:text-foreground"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
