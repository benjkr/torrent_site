import { useDevBranch } from "@/components/shared/useDevBranch";
import { cn } from "@/lib/utils";

/** DEV-only tiny horizontal bookmark, top-left. */
export function DevBookmark() {
  const branch = useDevBranch();

  if (!import.meta.env.DEV) return null;

  const label = branch ? `Development mode · ${branch}` : "Development mode";

  return (
    <div
      className="pointer-events-none fixed top-0 left-2 z-50"
      style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.4))" }}
    >
      <span aria-label={label} title={label} className="flex flex-col items-stretch">
        <span
          className={cn(
            "inline-flex h-3.5 items-center px-1.5",
            "border border-b-0 border-black/55 bg-[#0c0c0c]",
            "font-mono text-[0.5rem] font-semibold leading-none tracking-wide text-amber-300/90",
            "shadow-[inset_0_1px_2px_rgba(0,0,0,0.85)]",
          )}
        >
          DEV
        </span>
        <span
          aria-hidden
          className="block w-full bg-[#0c0c0c]"
          style={{
            height: "0.35rem",
            marginTop: "-1px",
            clipPath: "polygon(0 0, 100% 0, 50% 100%)",
          }}
        />
      </span>
    </div>
  );
}
