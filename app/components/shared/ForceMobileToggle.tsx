import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { SmartphoneIcon } from "lucide-react";

import { cn } from "@/lib/utils";

const FORCE_MOBILE_KEY = "torrent_site:debug:force_mobile";
const PHONE_PRESET_KEY = "torrent_site:debug:force_mobile_phone";

export type PhonePreset = {
  id: string;
  label: string;
  brand: "Apple" | "Google";
  width: number;
  height: number;
};

/**
 * CSS / points viewports (portrait).
 *
 * iPhone: logical points from Use Your Loaf (iOS screen sizes) —
 * https://useyourloaf.com/blog/iphone-17-screen-sizes/
 * https://useyourloaf.com/blog/iphone-16-screen-sizes/
 * Matches Apple @2x/@3x point space (same as CSS px in Safari).
 *
 * Pixel: default Android display-size CSS viewports (physical ÷ default DPR).
 * Widths cluster ~410–414; heights vary by model. Sources disagree slightly
 * (Chrome device mode / screensizechecker / viewpo); values below prefer
 * physical÷default_dpr rounded to whole CSS px.
 */
export const PHONE_PRESETS: readonly PhonePreset[] = [
  // —— iPhone (validated points) ——
  {
    id: "iphone-se",
    label: "iPhone SE (2nd/3rd)",
    brand: "Apple",
    width: 375,
    height: 667,
  },
  {
    id: "iphone-14",
    label: "iPhone 14 / 13 / 12",
    brand: "Apple",
    width: 390,
    height: 844,
  },
  {
    id: "iphone-16e",
    label: "iPhone 16e",
    brand: "Apple",
    width: 390,
    height: 844,
  },
  {
    id: "iphone-15",
    label: "iPhone 15 / 14 Pro",
    brand: "Apple",
    width: 393,
    height: 852,
  },
  {
    id: "iphone-16",
    label: "iPhone 16",
    brand: "Apple",
    width: 393,
    height: 852,
  },
  {
    id: "iphone-16-pro",
    label: "iPhone 16 Pro",
    brand: "Apple",
    width: 402,
    height: 874,
  },
  {
    id: "iphone-17",
    label: "iPhone 17",
    brand: "Apple",
    width: 402,
    height: 874,
  },
  {
    id: "iphone-17-pro",
    label: "iPhone 17 Pro",
    brand: "Apple",
    width: 402,
    height: 874,
  },
  {
    id: "iphone-air",
    label: "iPhone Air",
    brand: "Apple",
    width: 420,
    height: 912,
  },
  {
    id: "iphone-16-plus",
    label: "iPhone 16 Plus / 15 Pro Max",
    brand: "Apple",
    width: 430,
    height: 932,
  },
  {
    id: "iphone-16-pro-max",
    label: "iPhone 16 Pro Max",
    brand: "Apple",
    width: 440,
    height: 956,
  },
  {
    id: "iphone-17-pro-max",
    label: "iPhone 17 Pro Max",
    brand: "Apple",
    width: 440,
    height: 956,
  },

  // —— Pixel (CSS ≈ physical ÷ default DPR) ——
  // Pixel 7/8: 1080×2400 @ 2.625 → 412×915
  {
    id: "pixel-7",
    label: "Pixel 7",
    brand: "Google",
    width: 412,
    height: 915,
  },
  {
    id: "pixel-8",
    label: "Pixel 8",
    brand: "Google",
    width: 412,
    height: 915,
  },
  // Pixel 8 Pro: 1344×2992 @ 3.25 (default density) → ~412×921
  {
    id: "pixel-8-pro",
    label: "Pixel 8 Pro",
    brand: "Google",
    width: 412,
    height: 921,
  },
  // Pixel 9: 1080×2424 @ 2.625 → ~412×923
  {
    id: "pixel-9",
    label: "Pixel 9",
    brand: "Google",
    width: 412,
    height: 923,
  },
  // Pixel 9 Pro: 1280×2856 @ 3.125 → ~410×914
  {
    id: "pixel-9-pro",
    label: "Pixel 9 Pro",
    brand: "Google",
    width: 410,
    height: 914,
  },
  // Pixel 9 Pro XL: 1344×2992 @ 3.25 → ~414×921
  {
    id: "pixel-9-pro-xl",
    label: "Pixel 9 Pro XL",
    brand: "Google",
    width: 414,
    height: 921,
  },
  // Pixel 10 family — same panels as Pixel 9 (Google Store / GSMArena);
  // CSS viewports match Pixel 9 at default density (screensizechecker).
  // Pixel 10: 1080×2424 @ 2.625 → ~412×923
  {
    id: "pixel-10",
    label: "Pixel 10",
    brand: "Google",
    width: 412,
    height: 923,
  },
  // Pixel 10 Pro: 1280×2856 @ 3.125 → ~410×914
  {
    id: "pixel-10-pro",
    label: "Pixel 10 Pro",
    brand: "Google",
    width: 410,
    height: 914,
  },
  // Pixel 10 Pro XL: 1344×2992 @ 3.25 → ~414×921
  {
    id: "pixel-10-pro-xl",
    label: "Pixel 10 Pro XL",
    brand: "Google",
    width: 414,
    height: 921,
  },
] as const;

const DEFAULT_PHONE_ID = "iphone-16";


export function getPhonePreset(id: string): PhonePreset {
  return (
    PHONE_PRESETS.find((p) => p.id === id) ??
    PHONE_PRESETS.find((p) => p.id === DEFAULT_PHONE_ID) ??
    PHONE_PRESETS[0]!
  );
}

type Listener = () => void;

let forceMobile = false;
let phoneId = DEFAULT_PHONE_ID;
const listeners = new Set<Listener>();

function readPhoneId(): string {
  try {
    const raw = sessionStorage.getItem(PHONE_PRESET_KEY);
    if (raw && PHONE_PRESETS.some((p) => p.id === raw)) return raw;
  } catch {
    // ignore
  }
  return DEFAULT_PHONE_ID;
}

if (typeof window !== "undefined" && import.meta.env.DEV) {
  try {
    forceMobile = sessionStorage.getItem(FORCE_MOBILE_KEY) === "1";
    phoneId = readPhoneId();
  } catch {
    forceMobile = false;
    phoneId = DEFAULT_PHONE_ID;
  }
}

function emit() {
  for (const l of listeners) l();
}

function writeForceStored(value: boolean) {
  try {
    if (value) sessionStorage.setItem(FORCE_MOBILE_KEY, "1");
    else sessionStorage.removeItem(FORCE_MOBILE_KEY);
  } catch {
    // ignore
  }
}

function writePhoneStored(id: string) {
  try {
    sessionStorage.setItem(PHONE_PRESET_KEY, id);
  } catch {
    // ignore
  }
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getForceSnapshot() {
  return forceMobile;
}

function getPhoneSnapshot() {
  return phoneId;
}

function getServerSnapshotFalse() {
  return false;
}

function getServerPhoneSnapshot() {
  return DEFAULT_PHONE_ID;
}

/** Call once on client boot (DEV) to hydrate from sessionStorage. */
export function hydrateForceMobile() {
  if (!import.meta.env.DEV) return;
  let changed = false;
  try {
    const nextForce = sessionStorage.getItem(FORCE_MOBILE_KEY) === "1";
    const nextPhone = readPhoneId();
    if (nextForce !== forceMobile) {
      forceMobile = nextForce;
      changed = true;
    }
    if (nextPhone !== phoneId) {
      phoneId = nextPhone;
      changed = true;
    }
  } catch {
    // ignore
  }
  if (changed) emit();
}

export function setForceMobile(value: boolean) {
  if (!import.meta.env.DEV) return;
  forceMobile = value;
  writeForceStored(value);
  emit();
}

export function setForceMobilePhone(id: string) {
  if (!import.meta.env.DEV) return;
  if (!PHONE_PRESETS.some((p) => p.id === id)) return;
  phoneId = id;
  writePhoneStored(id);
  emit();
}

/** DEV-only: when true, platform switchers mount the mobile tree regardless of width. */
export function useForceMobile(): boolean {
  const value = useSyncExternalStore(
    subscribe,
    getForceSnapshot,
    getServerSnapshotFalse,
  );
  return import.meta.env.DEV ? value : false;
}

export function useForceMobilePhone(): PhonePreset {
  const id = useSyncExternalStore(
    subscribe,
    getPhoneSnapshot,
    getServerPhoneSnapshot,
  );
  return getPhonePreset(import.meta.env.DEV ? id : DEFAULT_PHONE_ID);
}

/**
 * Phone chassis for forced-mobile preview.
 * `transform` makes `position:fixed` chrome (dock, bookmarks) bind to the screen.
 */
export function ForceMobilePhoneFrame({ children }: { children: ReactNode }) {
  const phone = useForceMobilePhone();
  const isApple = phone.brand === "Apple";

  return (
    <div
      aria-label={`Forced mobile phone preview — ${phone.label}`}
      className="fixed inset-0 z-40 flex items-center justify-center bg-[#0a0a0a] p-4"
    >
      <div className="flex max-h-full flex-col items-center gap-2">
        <div
          className={cn(
            "relative shrink-0 p-3",
            isApple ? "rounded-[2.75rem]" : "rounded-[2.25rem]",
            "border border-white/15 bg-zinc-950",
            "shadow-[0_24px_80px_rgba(0,0,0,0.65),inset_0_1px_0_rgba(255,255,255,0.08)]",
          )}
        >
          {isApple ? (
            <div
              aria-hidden
              className="pointer-events-none absolute top-5 left-1/2 z-20 h-7 w-[7.5rem] -translate-x-1/2 rounded-full bg-black"
            />
          ) : (
            <div
              aria-hidden
              className="pointer-events-none absolute top-5 left-1/2 z-20 size-3 -translate-x-1/2 rounded-full bg-black ring-2 ring-zinc-800"
            />
          )}

          {/* Screen — @container so layout breakpoints follow phone width, not the desktop window.
              transform = fixed containing block for dock / DEV bookmark */}
          <div
            className={cn(
              "@container relative overflow-hidden bg-[#141414] text-foreground",
              isApple ? "rounded-[2.1rem]" : "rounded-[1.65rem]",
            )}
            style={{
              width: phone.width,
              height: `min(${phone.height}px, calc(100dvh - 5.5rem))`,
              transform: "translateZ(0)",
            }}
          >
            <div className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain">
              {children}
            </div>
          </div>
        </div>

        <p className="font-mono text-[0.625rem] tracking-wide text-white/35">
          {phone.label}
          <span className="text-white/20"> · </span>
          {phone.width}×{phone.height}
        </p>
      </div>
    </div>
  );
}

/** DEV-only toggle + phone size select — fixed bottom-left (outside the phone frame). */
export function ForceMobileToggle() {
  const on = useForceMobile();
  const phone = useForceMobilePhone();
  const hydrated = useRef(false);
  const [, bump] = useState(0);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    hydrateForceMobile();
    bump((n) => n + 1);
  }, []);

  const toggle = useCallback(() => {
    setForceMobile(!forceMobile);
  }, []);

  if (!import.meta.env.DEV) return null;

  const apple = PHONE_PRESETS.filter((p) => p.brand === "Apple");
  const pixel = PHONE_PRESETS.filter((p) => p.brand === "Google");

  return (
    <div className="pointer-events-none fixed bottom-4 left-4 z-[70] flex flex-col items-start gap-1.5">
      <button
        type="button"
        title={
          on
            ? "Exit phone preview — follow real viewport"
            : "Force mobile layout in a phone-sized frame"
        }
        aria-pressed={on}
        onClick={toggle}
        className={cn(
          "pointer-events-auto inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-[0.625rem] font-medium shadow-sm backdrop-blur-md transition-colors cursor-pointer",
          on
            ? "border-sky-400/40 bg-sky-500/25 text-sky-100"
            : "border-white/15 bg-black/50 text-muted-foreground hover:bg-black/65 hover:text-foreground",
        )}
      >
        <SmartphoneIcon className="size-3" />
        {on ? "Force mobile: ON" : "Force mobile"}
      </button>

      {on ? (
        <label className="pointer-events-auto flex items-center gap-1.5">
          <span className="sr-only">Phone size</span>
          <select
            value={phone.id}
            onChange={(e) => setForceMobilePhone(e.currentTarget.value)}
            title="Phone CSS viewport"
            className={cn(
              "max-w-[14rem] cursor-pointer rounded-md border border-white/15 bg-black/70 px-2 py-1",
              "font-mono text-[0.625rem] text-white/85 shadow-sm backdrop-blur-md outline-none",
              "hover:bg-black/85 focus-visible:ring-1 focus-visible:ring-sky-400/50",
            )}
          >
            <optgroup label="iPhone">
              {apple.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.width}×{p.height})
                </option>
              ))}
            </optgroup>
            <optgroup label="Pixel">
              {pixel.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label} ({p.width}×{p.height})
                </option>
              ))}
            </optgroup>
          </select>
        </label>
      ) : null}
    </div>
  );
}
