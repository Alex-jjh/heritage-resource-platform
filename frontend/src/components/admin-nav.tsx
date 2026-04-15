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
    <div className="mb-5">
      <h1>Admin Panel</h1>
      <div className="flex gap-1 border-b-2 border-gray-200">
        {TABS.map((tab) => {
          const active = pathname === tab.href;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={`px-4 py-2 no-underline -mb-0.5 ${
                active
                  ? "border-b-2 border-blue-600 text-blue-600 font-bold"
                  : "border-b-2 border-transparent text-gray-500"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
