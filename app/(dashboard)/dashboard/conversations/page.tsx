"use client";

import { Fragment, useEffect, useState, useCallback } from "react";
import { Badge } from "@/components/Badge";

interface Conversation {
  id: string;
  telegram_user_id: number;
  telegram_username: string | null;
  first_name: string | null;
  last_name: string | null;
  question: string;
  answer: string;
  agent_used: "hr_policy" | "general" | "blocked";
  response_time_ms: number | null;
  created_at: string;
}

const PAGE_SIZE = 25;

function agentBadgeVariant(agent: Conversation["agent_used"]) {
  if (agent === "hr_policy") return "hr_policy" as const;
  if (agent === "blocked") return "blocked" as const;
  return "general" as const;
}

function agentLabel(agent: Conversation["agent_used"]) {
  if (agent === "hr_policy") return "HR Policy";
  if (agent === "blocked") return "Blocked";
  return "General";
}

export default function ConversationsPage() {
  const [rows, setRows] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [agentFilter, setAgentFilter] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(PAGE_SIZE),
    });
    if (search) params.set("search", search);
    if (agentFilter) params.set("agent", agentFilter);

    fetch(`/api/admin/conversations?${params}`)
      .then((r) => r.json())
      .then((body) => {
        setRows(body.data ?? []);
        setTotal(body.total ?? 0);
      })
      .finally(() => setLoading(false));
  }, [page, search, agentFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="mx-auto max-w-6xl">
      <h1 className="text-2xl font-semibold text-fg">Conversations</h1>
      <p className="mt-1 text-sm text-fg-muted">
        Every question and answer, logged with the Telegram user's name and ID.
      </p>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <input
          value={search}
          onChange={(e) => {
            setPage(1);
            setSearch(e.target.value);
          }}
          placeholder="Search question, answer, or user…"
          className="w-64 rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        />
        <select
          value={agentFilter}
          onChange={(e) => {
            setPage(1);
            setAgentFilter(e.target.value);
          }}
          className="rounded-md border border-border px-3 py-1.5 text-sm outline-none focus:border-accent focus:ring-1 focus:ring-accent"
        >
          <option value="">All agents</option>
          <option value="hr_policy">HR Policy</option>
          <option value="general">General</option>
          <option value="blocked">Blocked</option>
        </select>
        <span className="text-xs text-fg-subtle">{total} total</span>
      </div>

      <div className="mt-4 overflow-hidden rounded-md border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-canvas-subtle text-xs uppercase text-fg-muted">
            <tr>
              <th className="px-4 py-2 font-medium">User</th>
              <th className="px-4 py-2 font-medium">Question</th>
              <th className="px-4 py-2 font-medium">Agent</th>
              <th className="px-4 py-2 font-medium">Response time</th>
              <th className="px-4 py-2 font-medium">Time</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const isOpen = expanded === row.id;
              const name = [row.first_name, row.last_name].filter(Boolean).join(" ") || "—";
              return (
                <Fragment key={row.id}>
                  <tr
                    onClick={() => setExpanded(isOpen ? null : row.id)}
                    className="cursor-pointer border-t border-border hover:bg-canvas-subtle"
                  >
                    <td className="px-4 py-2 align-top">
                      <div className="font-medium text-fg">{name}</div>
                      <div className="font-mono text-xs text-fg-subtle">
                        id: {row.telegram_user_id}
                        {row.telegram_username && ` · @${row.telegram_username}`}
                      </div>
                    </td>
                    <td className="max-w-md px-4 py-2 align-top text-fg">
                      {isOpen ? row.question : `${row.question.slice(0, 80)}${row.question.length > 80 ? "…" : ""}`}
                    </td>
                    <td className="px-4 py-2 align-top">
                      <Badge variant={agentBadgeVariant(row.agent_used)}>
                        {agentLabel(row.agent_used)}
                      </Badge>
                    </td>
                    <td className="px-4 py-2 align-top text-fg-muted">
                      {row.response_time_ms !== null ? `${row.response_time_ms} ms` : "—"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 align-top text-fg-muted">
                      {new Date(row.created_at).toLocaleString()}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-border bg-canvas-subtle">
                      <td colSpan={5} className="px-4 py-3">
                        <div className="text-xs font-medium uppercase text-fg-subtle">Answer</div>
                        <div className="mt-1 whitespace-pre-wrap text-sm text-fg">{row.answer}</div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-fg-muted">
                  No conversations found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-fg-muted">
        <span>Page {page} of {totalPages}</span>
        <div className="flex gap-2">
          <button
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
          >
            Previous
          </button>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            className="rounded-md border border-border px-3 py-1 disabled:opacity-40"
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}
