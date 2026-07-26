"use client";

import { useEffect, useState } from "react";

interface AllowedUser {
  id: string;
  telegram_user_id: number;
  label: string | null;
  added_at: string;
}

export default function AllowlistPage() {
  const [users, setUsers] = useState<AllowedUser[]>([]);
  const [userId, setUserId] = useState("");
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    fetch("/api/admin/allowlist")
      .then((r) => r.json())
      .then((body) => setUsers(body.data ?? []))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    const res = await fetch("/api/admin/allowlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        telegramUserId: Number(userId),
        label: label || undefined,
      }),
    });

    setSaving(false);

    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setError(body.error ?? "Failed to add user");
      return;
    }

    setUserId("");
    setLabel("");
    load();
  }

  async function handleRemove(id: string) {
    await fetch("/api/admin/allowlist", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-2xl font-semibold text-fg">Allowed Users</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Only Telegram user IDs on this list can get responses from the bot. Everyone
        else is silently declined and logged as blocked.
      </p>

      <form onSubmit={handleAdd} className="mt-6 flex flex-wrap items-end gap-3 rounded-md border border-border p-4">
        <div>
          <label className="text-xs font-medium text-fg-muted">Telegram user ID</label>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            required
            inputMode="numeric"
            placeholder="e.g. 123456789"
            className="mt-1 block w-48 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <div>
          <label className="text-xs font-medium text-fg-muted">Label (optional)</label>
          <input
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder="e.g. Ateef (interviewer demo)"
            className="mt-1 block w-64 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
          />
        </div>
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-emphasis disabled:opacity-60"
        >
          {saving ? "Adding…" : "Add user"}
        </button>
      </form>

      {error && (
        <div className="mt-3 rounded-md border border-danger/30 bg-danger-subtle px-3 py-2 text-sm text-danger">
          {error}
        </div>
      )}

      <div className="mt-6 overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas-subtle text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-4 py-2 font-medium">Telegram user ID</th>
              <th className="px-4 py-2 font-medium">Label</th>
              <th className="px-4 py-2 font-medium">Added</th>
              <th className="px-4 py-2 font-medium"></th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id} className="border-t border-border">
                <td className="px-4 py-2 font-mono text-fg">{u.telegram_user_id}</td>
                <td className="px-4 py-2 text-fg-muted">{u.label ?? "—"}</td>
                <td className="px-4 py-2 text-fg-muted">
                  {new Date(u.added_at).toLocaleDateString()}
                </td>
                <td className="px-4 py-2 text-right">
                  <button
                    onClick={() => handleRemove(u.id)}
                    className="text-xs font-medium text-danger hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
            {!loading && users.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-sm text-fg-muted">
                  No users allowed yet — add your Telegram ID above to start testing.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
