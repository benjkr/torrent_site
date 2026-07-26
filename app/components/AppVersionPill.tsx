import { getAppVersion } from "@/lib/app-version";
import { cn } from "@/lib/utils";

const engravedPill = cn(
  "rounded-full border border-black/60",
  "bg-[#0c0c0c]",
  "shadow-[inset_0_2px_4px_rgba(0,0,0,0.85),inset_0_-1px_0_rgba(255,255,255,0.06)]",
);

/** Always-visible engraved app version pill (tag · short commit). */
export function AppVersionPill() {
  const { tag, commit } = getAppVersion();

  return (
    <span
      title={`App ${tag} · ${commit}`}
      aria-label={`App version ${tag}, commit ${commit}`}
      className={cn(
        engravedPill,
        "inline-flex h-5 items-center gap-1.5 px-2",
        "font-mono text-[0.625rem] tracking-tight text-white/70",
      )}
    >
      <span className="text-white/85">{tag}</span>
      <span className="text-white/20">·</span>
      <span className="text-white/40">{commit}</span>
    </span>
  );
}
