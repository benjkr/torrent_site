import { useState, type ReactNode } from "react";
import { BugIcon, CopyIcon, XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { SearchResultsView } from "@/components/SearchResultsTable";
import { cn } from "@/lib/utils";
import type { SearchDebugInfo } from "@/lib/types";

export interface SearchClientDebug {
  apiUrl: string | null;
  imdbId: string | null;
  imdbTitle: string | null;
  episodeLabel: string | null;
  imdbFilterActive: boolean;
  clientFilteredCount: number;
  clientTotalCount: number;
  isLoading: boolean;
}

interface SearchDebugPanelProps {
  server: SearchDebugInfo | null;
  client: SearchClientDebug;
  resultsView: SearchResultsView;
  onResultsViewChange: (v: SearchResultsView) => void;
}

function FlagGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { id: T; label: string; hint: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <section className="flex items-center justify-between gap-3">
      <h3 className="shrink-0 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </h3>
      <div className="inline-flex rounded-md border border-border/60 bg-muted/30 p-0.5">
        {options.map((opt) => {
          const on = value === opt.id;
          return (
            <button
              key={opt.id}
              type="button"
              title={opt.hint}
              onClick={() => onChange(opt.id)}
              className={cn(
                "rounded px-2 py-0.5 text-[0.625rem] font-medium transition-colors",
                on
                  ? "bg-foreground text-background shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </section>
  );
}

function JsonBlock({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  const text = JSON.stringify(value, null, 2) ?? "null";

  return (
    <section className="space-y-1.5">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h3>
        <Button
          type="button"
          variant="ghost"
          size="xs"
          className="h-6 gap-1 px-1.5 text-[0.625rem]"
          onClick={() => void navigator.clipboard.writeText(text)}
          title="Copy JSON"
        >
          <CopyIcon className="size-3" />
          Copy
        </Button>
      </div>
      <pre className="max-h-64 overflow-auto rounded-md border border-border/60 bg-muted/40 p-2 text-[0.625rem] leading-relaxed text-foreground/90">
        {text}
      </pre>
    </section>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid grid-cols-[7rem_minmax(0,1fr)] gap-2 text-[0.6875rem]">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0 break-all font-medium text-foreground/90">
        {children}
      </dd>
    </div>
  );
}

export default function SearchDebugPanel({
  server,
  client,
  resultsView,
  onResultsViewChange,
}: SearchDebugPanelProps) {
  const [open, setOpen] = useState(false);

  if (!import.meta.env.DEV) return null;

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className={cn(
          "fixed bottom-4 right-4 z-[60] gap-1.5 shadow-lg",
          open && "pointer-events-none opacity-0",
        )}
        onClick={() => setOpen(true)}
        aria-expanded={open}
      >
        <BugIcon className="size-3.5" />
        Debug
      </Button>

      {open ? (
        <div
          className="fixed inset-y-0 right-0 z-[70] flex w-full max-w-md flex-col border-l border-border bg-card shadow-2xl"
          role="dialog"
          aria-label="Search debug"
        >
          <header className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2.5">
            <div className="flex items-center gap-1.5 text-sm font-semibold">
              <BugIcon className="size-4 text-muted-foreground" />
              Search debug
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={() => setOpen(false)}
              title="Close"
            >
              <XIcon />
            </Button>
          </header>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain p-3">
            <div className="space-y-3">
              <p className="text-[0.625rem] text-muted-foreground">
                Dev-only. Production: Soft well · title trail.
              </p>
              <FlagGroup
                label="Results"
                value={resultsView}
                onChange={onResultsViewChange}
                options={[
                  {
                    id: "well",
                    label: "Trail",
                    hint: "Age under title; IMDb after title.",
                  },
                  {
                    id: "meta",
                    label: "Meta",
                    hint: "Previous: age + IMDb in the meta row.",
                  },
                  {
                    id: "chips",
                    label: "Chips",
                    hint: "Previous raised meta pills.",
                  },
                  {
                    id: "clean",
                    label: "Clean",
                    hint: "Previous dense dotted meta list.",
                  },
                ]}
              />
            </div>

            <section className="space-y-2">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Request
              </h3>
              <dl className="space-y-1.5">
                <Row label="Query">{server?.query ?? "—"}</Row>
                <Row label="Filters">
                  {server?.filters?.length
                    ? server.filters.join(", ")
                    : "none"}
                </Row>
                <Row label="API URL">{client.apiUrl ?? "—"}</Row>
                <Row label="Fetched">
                  {server
                    ? `${server.fetchedAt} · ${server.durationMs}ms`
                    : client.isLoading
                      ? "Loading…"
                      : "—"}
                </Row>
              </dl>
            </section>

            {server?.queries?.length ? (
              <section className="space-y-2">
                <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Apibay queries
                </h3>
                <ul className="space-y-2">
                  {server.queries.map((branch) => (
                    <li
                      key={branch.url + branch.label}
                      className="rounded-md border border-border/60 bg-muted/30 px-2 py-1.5 text-[0.6875rem]"
                    >
                      <div className="font-medium text-foreground/90">
                        {branch.label}
                      </div>
                      <a
                        href={branch.url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-0.5 block break-all text-imdb-foreground underline-offset-2 hover:underline"
                      >
                        {branch.url}
                      </a>
                      <div className="mt-1 text-muted-foreground">
                        raw {branch.rawCount} · after {branch.afterFilterCount}
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <section className="space-y-2">
                <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                  Apibay
                </h3>
                <dl className="space-y-1.5">
                  <Row label="URL">
                    {server?.apibayUrl ? (
                      <a
                        href={server.apibayUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-imdb-foreground underline-offset-2 hover:underline"
                      >
                        {server.apibayUrl}
                      </a>
                    ) : (
                      "—"
                    )}
                  </Row>
                </dl>
              </section>
            )}

            <section className="space-y-2">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Counts
              </h3>
              <dl className="space-y-1.5">
                <Row label="Raw">{server?.rawCount ?? "—"}</Row>
                <Row label="Merged">
                  {server?.afterFilterCount ?? "—"}
                </Row>
                <Row label="Returned">{server?.returnedCount ?? "—"}</Row>
                <Row label="Client IMDb">
                  {client.imdbFilterActive
                    ? `${client.clientFilteredCount} / ${client.clientTotalCount}`
                    : `${client.clientTotalCount} (no IMDb filter)`}
                </Row>
              </dl>
            </section>

            <section className="space-y-2">
              <h3 className="text-[0.6875rem] font-semibold uppercase tracking-wide text-muted-foreground">
                Client context
              </h3>
              <dl className="space-y-1.5">
                <Row label="IMDb">
                  {client.imdbId
                    ? `${client.imdbTitle ?? "?"} (${client.imdbId})`
                    : "—"}
                </Row>
                <Row label="Episode">{client.episodeLabel ?? "—"}</Row>
                <Row label="IMDb filter">
                  {client.imdbFilterActive ? "on" : "off"}
                </Row>
              </dl>
            </section>

            <JsonBlock label="Raw apibay rows" value={server?.raw ?? []} />
            <JsonBlock
              label="Filtered (pre-slice)"
              value={server?.filtered ?? []}
            />
            <JsonBlock
              label="Returned items"
              value={
                server
                  ? server.filtered.slice(0, server.returnedCount)
                  : []
              }
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
