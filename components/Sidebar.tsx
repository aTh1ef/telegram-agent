"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: "⌂" },
  { href: "/dashboard/conversations", label: "Conversations", icon: "⚘" },
  { href: "/dashboard/allowlist", label: "Allowed Users", icon: "✓" },
  { href: "/dashboard/policies", label: "HR Policies", icon: "☷" },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-border bg-canvas-subtle">
      <div className="border-b border-border px-4 py-4">
        <div className="text-sm font-semibold text-fg">HR Assistant</div>
        <div className="text-xs text-fg-subtle">Admin dashboard</div>
      </div>

      <nav className="flex-1 space-y-0.5 p-2">
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/dashboard"
              ? pathname === "/dashboard"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-accent-subtle text-accent-emphasis"
                  : "text-fg-muted hover:bg-canvas-inset hover:text-fg"
              }`}
            >
              <span aria-hidden className="w-4 text-center">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-2">
        <button
          onClick={handleLogout}
          className="w-full rounded-md px-3 py-2 text-left text-sm font-medium text-fg-muted hover:bg-canvas-inset hover:text-fg"
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
