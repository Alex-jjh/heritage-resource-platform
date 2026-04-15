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
    <div style={{ marginBottom: 20 }}>
      <h1>Admin Panel</h1>
      <div style={{ display: "flex", gap: 4, borderBottom: "2px solid #ddd", paddingBottom: 0 }}>
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              style={{
                padding: "8px 16px",
                textDecoration: "none",
                borderBottom: active ? "2px solid #1a73e8" : "2px solid transparent",
                color: active ? "#1a73e8" : "#666",
                fontWeight: active ? "bold" : "normal",
                marginBottom: -2,
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
