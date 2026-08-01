import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { AppSettings } from "../lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import { useQbStatus } from "../lib/qb-status";

const EMPTY: AppSettings = {
  save_path: "",
  temp_path: "",
  temp_path_enabled: false,
  start_paused_enabled: false,
  create_subfolder_enabled: true,
  dl_limit: -1,
  up_limit: -1,
  queueing_enabled: false,
  max_active_downloads: 3,
  max_active_uploads: 3,
  max_active_torrents: 5,
};

function limitDisplay(value: number): string {
  return value < 0 ? "" : String(value);
}

function parseLimitInput(raw: string): number {
  const trimmed = raw.trim();
  if (!trimmed) return -1;
  const n = Number(trimmed);
  return Number.isFinite(n) ? Math.trunc(n) : -1;
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-4 space-y-4 h-full">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <h2 className="text-sm font-semibold">{title}</h2>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      {children}
    </section>
  );
}

function SwitchRow({
  label,
  hint,
  checked,
  onCheckedChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="min-w-0">
        <div className="text-xs font-medium">{label}</div>
        <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} size="sm" />
    </div>
  );
}

function Field({
  id,
  label,
  hint,
  children,
}: {
  id: string;
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-xs font-medium">
        {label}
      </label>
      {children}
      {hint ? (
        <p className="text-[0.6875rem] text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export default function SettingsPage() {
  const qb = useQbStatus();
  const { online, state } = qb;
  const qbError = qb.state === "offline" ? qb.error : undefined;
  const [settings, setSettings] = useState<AppSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [dirty, setDirty] = useState(false);

  const load = async () => {
    if (!online) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || `Failed to load settings (${res.status})`);
        return;
      }
      setSettings(data as AppSettings);
      setDirty(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!online) {
      setLoading(false);
      setError(null);
      setDirty(false);
      setSaved(false);
      setSettings(EMPTY);
      return;
    }
    void load();
  }, [online]);

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
    setDirty(true);
    setSaved(false);
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!online) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setError(data.error || `Save failed (${res.status})`);
        return;
      }
      if (data.settings) {
        setSettings(data.settings);
      }
      setDirty(false);
      setSaved(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  if (!online) {
    const message =
      state === "offline"
        ? qbError || "qBittorrent is unreachable"
        : "Waiting for qBittorrent…";
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            These options are stored in qBittorrent application preferences.
          </p>
        </div>
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          Settings unavailable — {message}
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 pb-10">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Settings</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            These options are stored in qBittorrent application preferences.
          </p>
        </div>
        {!loading && (
          <div className="flex items-center gap-3">
            {saved && !dirty && (
              <span className="text-xs text-emerald-600">Saved</span>
            )}
            {dirty && (
              <span className="text-xs text-muted-foreground">Unsaved changes</span>
            )}
            <Button
              type="submit"
              form="settings-form"
              disabled={saving || !dirty || !settings.save_path.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              {saving ? "Saving…" : "Save settings"}
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
          <button
            type="button"
            className="ml-2 underline cursor-pointer"
            onClick={() => void load()}
          >
            Retry
          </button>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-muted-foreground">Loading settings…</p>
      ) : (
        <form id="settings-form" onSubmit={onSubmit} className="space-y-4">
          <Section
            title="Downloads"
            description="Default paths used when adding new torrents."
          >
            <div className="grid gap-4 @sm:grid-cols-2">
              <Field
                id="save_path"
                label="Default download folder"
                hint="Used unless a category overrides the path."
              >
                <Input
                  id="save_path"
                  value={settings.save_path}
                  onChange={(e) => update("save_path", e.currentTarget.value)}
                  placeholder="e.g. D:\Downloads"
                  required
                  className="font-mono text-sm"
                />
              </Field>

              <div className="space-y-3">
                <SwitchRow
                  label="Use incomplete folder"
                  hint="Keep unfinished downloads in a separate path."
                  checked={settings.temp_path_enabled}
                  onCheckedChange={(v) => update("temp_path_enabled", v)}
                />
                <div
                  className={cn(
                    "space-y-1.5 transition-opacity",
                    !settings.temp_path_enabled && "opacity-50 pointer-events-none",
                  )}
                >
                  <label htmlFor="temp_path" className="text-xs font-medium">
                    Incomplete downloads folder
                  </label>
                  <Input
                    id="temp_path"
                    value={settings.temp_path}
                    onChange={(e) => update("temp_path", e.currentTarget.value)}
                    placeholder="e.g. D:\Incomplete"
                    disabled={!settings.temp_path_enabled}
                    className="font-mono text-sm"
                  />
                </div>
              </div>
            </div>
          </Section>

          <div className="grid gap-4 @md:grid-cols-2">
            <Section
              title="Adding torrents"
              description="Defaults when a magnet is sent from Search."
            >
              <div className="grid gap-3 @sm:grid-cols-2 @md:grid-cols-1 @xl:grid-cols-2">
                <SwitchRow
                  label="Start paused"
                  hint="Add paused instead of downloading."
                  checked={settings.start_paused_enabled}
                  onCheckedChange={(v) => update("start_paused_enabled", v)}
                />
                <SwitchRow
                  label="Create subfolder"
                  hint="Subfolder for multi-file torrents."
                  checked={settings.create_subfolder_enabled}
                  onCheckedChange={(v) => update("create_subfolder_enabled", v)}
                />
              </div>
            </Section>

            <Section
              title="Speed"
              description="Global rate limits in KiB/s. Blank = unlimited."
            >
              <div className="grid grid-cols-2 gap-3">
                <Field id="dl_limit" label="Download">
                  <Input
                    id="dl_limit"
                    type="number"
                    min={-1}
                    value={limitDisplay(settings.dl_limit)}
                    onChange={(e) =>
                      update("dl_limit", parseLimitInput(e.currentTarget.value))
                    }
                    placeholder="Unlimited"
                    className="font-mono text-sm"
                  />
                </Field>
                <Field id="up_limit" label="Upload">
                  <Input
                    id="up_limit"
                    type="number"
                    min={-1}
                    value={limitDisplay(settings.up_limit)}
                    onChange={(e) =>
                      update("up_limit", parseLimitInput(e.currentTarget.value))
                    }
                    placeholder="Unlimited"
                    className="font-mono text-sm"
                  />
                </Field>
              </div>
            </Section>
          </div>

          <Section
            title="Queueing"
            description="Limit how many torrents are active at once."
          >
            <div className="flex flex-col gap-4 @sm:flex-row @sm:items-start">
              <div className="@sm:w-56 @sm:shrink-0">
                <SwitchRow
                  label="Enable queueing"
                  hint="Enforce active download/upload caps."
                  checked={settings.queueing_enabled}
                  onCheckedChange={(v) => update("queueing_enabled", v)}
                />
              </div>
              <div
                className={cn(
                  "grid flex-1 grid-cols-3 gap-3 transition-opacity",
                  !settings.queueing_enabled && "opacity-50 pointer-events-none",
                )}
              >
                <Field id="max_active_downloads" label="Max downloads">
                  <Input
                    id="max_active_downloads"
                    type="number"
                    min={0}
                    value={settings.max_active_downloads}
                    onChange={(e) =>
                      update(
                        "max_active_downloads",
                        Math.max(0, Math.trunc(Number(e.currentTarget.value) || 0)),
                      )
                    }
                    disabled={!settings.queueing_enabled}
                    className="font-mono text-sm"
                  />
                </Field>
                <Field id="max_active_uploads" label="Max uploads">
                  <Input
                    id="max_active_uploads"
                    type="number"
                    min={0}
                    value={settings.max_active_uploads}
                    onChange={(e) =>
                      update(
                        "max_active_uploads",
                        Math.max(0, Math.trunc(Number(e.currentTarget.value) || 0)),
                      )
                    }
                    disabled={!settings.queueing_enabled}
                    className="font-mono text-sm"
                  />
                </Field>
                <Field id="max_active_torrents" label="Max active">
                  <Input
                    id="max_active_torrents"
                    type="number"
                    min={0}
                    value={settings.max_active_torrents}
                    onChange={(e) =>
                      update(
                        "max_active_torrents",
                        Math.max(0, Math.trunc(Number(e.currentTarget.value) || 0)),
                      )
                    }
                    disabled={!settings.queueing_enabled}
                    className="font-mono text-sm"
                  />
                </Field>
              </div>
            </div>
          </Section>
        </form>
      )}
    </div>
  );
}
