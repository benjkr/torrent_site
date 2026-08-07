import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router";

import {
  TetrisPiecesPopup,
  TETRIS_DESIGNS,
  type TetrisDesignId,
} from "@/components/shared/tetris-pieces/TetrisPiecesDesigns";
import { packTetris, kindMix } from "@/lib/tetris-pieces";
import { cn } from "@/lib/utils";

export function meta() {
  return [{ title: "Tetris pieces designs · debug" }];
}

type MockTorrent = {
  id: string;
  label: string;
  hash: string;
  total: number;
};

const MOCKS: MockTorrent[] = [
  {
    id: "tiny",
    label: "Tiny · 12 pcs",
    hash: "a1b2c3d4e5f60718293a4b5c6d7e8f901234abcd",
    total: 12,
  },
  {
    id: "small",
    label: "Small · 24 pcs",
    hash: "f00dcafe1234567890abcdef1234567890abcdef",
    total: 24,
  },
  {
    id: "medium",
    label: "Medium · 40 pcs",
    hash: "deadbeefcafebabe0123456789abcdef01234567",
    total: 40,
  },
  {
    id: "large",
    label: "Large · 80 pcs",
    hash: "0123456789abcdef0123456789abcdef01234567",
    total: 80,
  },
  {
    id: "alt",
    label: "Alt hash · 24 pcs",
    hash: "99887766554433221100ffeeddccbbaa99887766",
    total: 24,
  },
];

export default function DebugTetrisPiecesPage() {
  const [mockId, setMockId] = useState(MOCKS[0]!.id);
  const mock = MOCKS.find((m) => m.id === mockId) ?? MOCKS[0]!;
  const [complete, setComplete] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // tetrominoes per tick

  const packing = useMemo(
    () => packTetris(mock.hash, mock.total),
    [mock.hash, mock.total],
  );
  const mix = useMemo(() => kindMix(packing), [packing]);

  useEffect(() => {
    setComplete(0);
    setPlaying(false);
  }, [mock.id]);

  useEffect(() => {
    if (!playing) return;
    const id = setInterval(() => {
      setComplete((c) => {
        if (c >= mock.total) {
          setPlaying(false);
          return mock.total;
        }
        return Math.min(mock.total, c + speed);
      });
    }, 280);
    return () => clearInterval(id);
  }, [playing, mock.total, speed]);

  const jump = useCallback(
    (pct: number) => setComplete(Math.round(mock.total * pct)),
    [mock.total],
  );

  return (
    <div className="min-h-screen bg-zinc-950 text-white">
      <div
        className="pointer-events-none fixed inset-0 opacity-80"
        style={{
          background:
            "radial-gradient(ellipse 80% 50% at 50% -10%, rgba(56,189,248,0.18), transparent 55%), radial-gradient(ellipse 60% 40% at 100% 50%, rgba(168,85,247,0.12), transparent 50%), radial-gradient(ellipse 50% 40% at 0% 80%, rgba(52,211,153,0.1), transparent 50%)",
        }}
      />

      <div className="relative mx-auto max-w-6xl px-6 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <Link
              to="/library"
              className="text-[0.625rem] uppercase tracking-wide text-white/40 hover:text-white/70"
            >
              ← Library
            </Link>
            <h1 className="mt-2 text-xl font-medium tracking-tight">
              Tetris pieces
            </h1>
            <p className="mt-1 max-w-xl text-sm text-white/50">
              Classic tetrominoes hard-drop and stack like a real game (no line
              clears). Each download is one drop; the well ends 100% full. Layout
              is a hash-seeded playthrough ({packing.cols}×{packing.rows}).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {MOCKS.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => setMockId(m.id)}
                className={cn(
                  "rounded-full border px-2.5 py-1 text-[0.625rem] transition-colors cursor-pointer",
                  m.id === mockId
                    ? "border-white/30 bg-white/15 text-white"
                    : "border-white/10 bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80",
                )}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-8 rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-xs cursor-pointer hover:bg-white/15"
            >
              {playing ? "Pause" : "Play drops"}
            </button>
            <button
              type="button"
              onClick={() => {
                setPlaying(false);
                setComplete(0);
              }}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/70 cursor-pointer hover:bg-black/45"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={() => jump(1)}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/70 cursor-pointer hover:bg-black/45"
            >
              Fill
            </button>
            <label className="ml-2 flex items-center gap-2 text-[0.625rem] text-white/50">
              Speed
              <select
                value={speed}
                onChange={(e) => setSpeed(Number(e.target.value))}
                className="rounded-md border border-white/15 bg-zinc-900 px-1.5 py-1 text-white/80"
              >
                <option value={1}>1 / tick</option>
                <option value={2}>2 / tick</option>
                <option value={4}>4 / tick</option>
                <option value={8}>8 / tick</option>
              </select>
            </label>
            <div className="min-w-[200px] flex-1">
              <input
                type="range"
                min={0}
                max={mock.total}
                value={complete}
                onChange={(e) => {
                  setPlaying(false);
                  setComplete(Number(e.target.value));
                }}
                className="w-full accent-sky-400"
              />
            </div>
            <div className="text-xs tabular-nums text-white/60">
              {complete}/{mock.total} drops
              <span className="mx-2 text-white/25">·</span>
              {packing.cells} blocks
            </div>
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5 text-[0.625rem] tabular-nums">
            {(
              [
                ["I", mix.I, "text-cyan-300"],
                ["O", mix.O, "text-yellow-300"],
                ["T", mix.T, "text-purple-300"],
                ["L", mix.L, "text-orange-300"],
                ["J", mix.J, "text-blue-300"],
                ["S", mix.S, "text-green-300"],
                ["Z", mix.Z, "text-red-300"],
              ] as const
            ).map(([k, n, cls]) => (
              <span
                key={k}
                className={cn(
                  "rounded-md border border-white/10 bg-black/30 px-1.5 py-0.5",
                  n === 0 ? "text-white/25" : cls,
                )}
              >
                {k} {n}
              </span>
            ))}
          </div>
          <p className="mt-2 text-[0.625rem] text-white/35">
            Play drops stacks pieces one-at-a-time with gravity. Change mock
            torrent for a different game.
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
          {TETRIS_DESIGNS.map((d) => (
            <DesignCard
              key={d.id}
              design={d.id}
              name={d.name}
              blurb={d.blurb}
              hash={mock.hash}
              total={mock.total}
              complete={complete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function DesignCard({
  design,
  name,
  blurb,
  hash,
  total,
  complete,
}: {
  design: TetrisDesignId;
  name: string;
  blurb: string;
  hash: string;
  total: number;
  complete: number;
}) {
  return (
    <section className="flex flex-col items-start gap-3">
      <div>
        <h2 className="text-sm font-medium text-white/90">{name}</h2>
        <p className="mt-0.5 text-[0.625rem] text-white/40">{blurb}</p>
      </div>
      {/* Mock library card chrome so the popup reads in context */}
      <div className="w-full rounded-2xl border border-white/15 bg-white/5 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="mb-3 flex items-center gap-2 text-[0.625rem] text-white/40">
          <span className="inline-block size-8 rounded-md bg-white/10" />
          <span className="truncate">Mock torrent card</span>
        </div>
        <TetrisPiecesPopup
          design={design}
          hash={hash}
          total={total}
          complete={complete}
          animate
        />
      </div>
    </section>
  );
}
