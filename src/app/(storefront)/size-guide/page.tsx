"use client";

import { useState, useMemo } from "react";
import { Ruler } from "lucide-react";

/* ============================================================
   DATA
   ============================================================ */

type Unit = "cm" | "in";

interface Column {
  key: string;
  label: string;
  highlightId?: string; // links this column to a diagram measurement line
}

interface Category {
  id: string;
  label: string;
  kind: "body" | "product";
  intro: string;
  columns: Column[];
  rows: Record<string, string | number>[];
}

const CATEGORIES: Category[] = [
  {
    id: "tops",
    label: "Tops & Jackets",
    kind: "body",
    intro: "Measurements in cm, taken at the fullest point of each area.",
    columns: [
      { key: "size", label: "Size" },
      { key: "chest", label: "Chest", highlightId: "chest" },
      { key: "waist", label: "Waist", highlightId: "waist" },
      { key: "shoulder", label: "Shoulder", highlightId: "shoulder" },
      { key: "sleeve", label: "Sleeve", highlightId: "sleeve" },
    ],
    rows: [
      { size: "XS", chest: 84, waist: 68, shoulder: 42, sleeve: 60 },
      { size: "S", chest: 89, waist: 73, shoulder: 43.5, sleeve: 61 },
      { size: "M", chest: 96, waist: 80, shoulder: 45, sleeve: 62 },
      { size: "L", chest: 104, waist: 88, shoulder: 47, sleeve: 63 },
      { size: "XL", chest: 112, waist: 96, shoulder: 49, sleeve: 64 },
      { size: "XXL", chest: 120, waist: 104, shoulder: 51, sleeve: 65 },
    ],
  },
  {
    id: "bottoms",
    label: "Leggings & Bottoms",
    kind: "body",
    intro: "Waist taken at the narrowest point, hips at the fullest.",
    columns: [
      { key: "size", label: "Size" },
      { key: "waist", label: "Waist", highlightId: "waist" },
      { key: "hips", label: "Hips", highlightId: "hips" },
      { key: "inseam", label: "Inseam", highlightId: "inseam" },
    ],
    rows: [
      { size: "XS", waist: 63, hips: 88, inseam: 71 },
      { size: "S", waist: 68, hips: 93, inseam: 72 },
      { size: "M", waist: 74, hips: 99, inseam: 73 },
      { size: "L", waist: 81, hips: 106, inseam: 74 },
      { size: "XL", waist: 89, hips: 114, inseam: 75 },
      { size: "XXL", waist: 97, hips: 122, inseam: 76 },
    ],
  },
  {
    id: "sports-bras",
    label: "Sports Bras",
    kind: "body",
    intro:
      "Band size + cup, measured under and around the fullest point of the bust.",
    columns: [
      { key: "size", label: "Size" },
      { key: "band", label: "Band", highlightId: "band" },
      { key: "bust", label: "Bust", highlightId: "chest" },
      { key: "cup", label: "Cup" },
    ],
    rows: [
      { size: "XS", band: 68, bust: 80, cup: "A–B" },
      { size: "S", band: 73, bust: 85, cup: "A–C" },
      { size: "M", band: 78, bust: 91, cup: "B–D" },
      { size: "L", band: 85, bust: 99, cup: "C–D" },
      { size: "XL", band: 93, bust: 107, cup: "C–E" },
    ],
  },
  {
    id: "bottles",
    label: "Bottles & Accessories",
    kind: "product",
    intro:
      "Dimensions for our hydration and accessory range — no fit guessing required.",
    columns: [
      { key: "name", label: "Item" },
      { key: "capacity", label: "Capacity" },
      { key: "height", label: "Height", highlightId: undefined },
      { key: "diameter", label: "Diameter", highlightId: undefined },
    ],
    rows: [
      {
        name: "Sport Bottle 500",
        capacity: "500 ml",
        height: 21.5,
        diameter: 6.8,
      },
      {
        name: "Sport Bottle 750",
        capacity: "750 ml",
        height: 26,
        diameter: 7.2,
      },
      {
        name: "Insulated Flask",
        capacity: "600 ml",
        height: 24,
        diameter: 7.5,
      },
      { name: "Gym Duffel — S", capacity: "22 L", height: 28, diameter: 45 },
      { name: "Gym Duffel — L", capacity: "40 L", height: 32, diameter: 55 },
    ],
  },
];

const CM_TO_IN = 0.3937;

function convert(value: number, unit: Unit): string {
  if (unit === "cm") return value.toFixed(1).replace(/\.0$/, "");
  return (value * CM_TO_IN).toFixed(1);
}

/* ============================================================
   BODY DIAGRAM — the signature element
   ============================================================ */

function MeasurementDiagram({ activeId }: { activeId: string | null }) {
  const lit = (id: string) => activeId === id;

  return (
    <svg
      viewBox="0 0 200 340"
      className="w-full max-w-[220px] mx-auto"
      role="img"
      aria-label="Diagram showing where to take body measurements"
    >
      {/* Figure outline */}
      <path
        d="M100 20 C 88 20 80 30 80 42 C 80 52 85 58 92 62 L 76 78 C 60 88 52 108 50 130 L 46 190 L 62 192 L 68 140 L 70 240 L 66 320 L 84 320 L 92 220 L 100 220 L 108 220 L 116 320 L 134 320 L 130 240 L 132 140 L 138 192 L 154 190 L 150 130 C 148 108 140 88 124 78 L 108 62 C 115 58 120 52 120 42 C 120 30 112 20 100 20 Z"
        fill="none"
        className="stroke-neutral-300"
        strokeWidth="1.5"
      />

      {/* Shoulder line */}
      <line
        x1="76"
        y1="76"
        x2="124"
        y2="76"
        strokeWidth={lit("shoulder") ? 2.5 : 1}
        className={
          lit("shoulder") ? "stroke-primary-500" : "stroke-neutral-200"
        }
        strokeDasharray={lit("shoulder") ? "0" : "3 3"}
      />

      {/* Chest / bust / band line */}
      <line
        x1="54"
        y1="108"
        x2="146"
        y2="108"
        strokeWidth={lit("chest") || lit("band") ? 2.5 : 1}
        className={
          lit("chest") || lit("band")
            ? "stroke-primary-500"
            : "stroke-neutral-200"
        }
        strokeDasharray={lit("chest") || lit("band") ? "0" : "3 3"}
      />

      {/* Waist line */}
      <line
        x1="58"
        y1="150"
        x2="142"
        y2="150"
        strokeWidth={lit("waist") ? 2.5 : 1}
        className={lit("waist") ? "stroke-primary-500" : "stroke-neutral-200"}
        strokeDasharray={lit("waist") ? "0" : "3 3"}
      />

      {/* Hips line */}
      <line
        x1="50"
        y1="188"
        x2="150"
        y2="188"
        strokeWidth={lit("hips") ? 2.5 : 1}
        className={lit("hips") ? "stroke-primary-500" : "stroke-neutral-200"}
        strokeDasharray={lit("hips") ? "0" : "3 3"}
      />

      {/* Inseam line */}
      <line
        x1="98"
        y1="222"
        x2="98"
        y2="318"
        strokeWidth={lit("inseam") ? 2.5 : 1}
        className={lit("inseam") ? "stroke-primary-500" : "stroke-neutral-200"}
        strokeDasharray={lit("inseam") ? "0" : "3 3"}
      />

      {/* Sleeve line */}
      <line
        x1="76"
        y1="76"
        x2="46"
        y2="188"
        strokeWidth={lit("sleeve") ? 2.5 : 1}
        className={lit("sleeve") ? "stroke-primary-500" : "stroke-neutral-200"}
        strokeDasharray={lit("sleeve") ? "0" : "3 3"}
      />
    </svg>
  );
}

/* ============================================================
   PAGE
   ============================================================ */

export default function SizeGuidePage() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [unit, setUnit] = useState<Unit>("cm");
  const [hoveredColumn, setHoveredColumn] = useState<string | null>(null);

  const category = useMemo(
    () => CATEGORIES.find((c) => c.id === activeCategory)!,
    [activeCategory],
  );

  return (
    <main className="min-h-screen bg-white">
      {/* Header */}
      <section className="border-b border-neutral-100">
        <div className="mx-auto max-w-[1400px] px-4 py-14 mt-20 sm:mt-10">
          <p className="text-[10px] font-sans font-semibold uppercase tracking-[0.16em] text-primary-500 mb-3">
            Fit & sizing
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl font-medium text-neutral-600 mb-3">
            Size guide
          </h1>
          <p className="text-sm text-neutral-400 max-w-md leading-relaxed">
            Every body moves differently. Find your fit below — for apparel and
            for the gear that goes with it.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-[1400px] px-4 py-12">
        {/* Category tabs */}
        <div className="flex flex-wrap gap-x-8 gap-y-3 border-b border-neutral-100 mb-10">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`pb-4 text-sm font-medium font-sans transition-colors border-b-2 -mb-px ${
                activeCategory === cat.id
                  ? "text-neutral-600 border-primary-400"
                  : "text-neutral-400 border-transparent hover:text-neutral-500"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-10">
          {/* Diagram — only meaningful for body-based categories */}
          <div className="hidden lg:block">
            {category.kind === "body" ? (
              <div className="sticky top-24">
                <MeasurementDiagram activeId={hoveredColumn} />
                <p className="text-[10px] font-sans text-neutral-400 text-center mt-4 uppercase tracking-widest">
                  Hover a column
                </p>
              </div>
            ) : (
              <div className="sticky top-24 flex flex-col items-center text-center gap-3 pt-8">
                <Ruler size={28} className="text-neutral-300" />
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Measured flat, at the widest point of each dimension.
                </p>
              </div>
            )}
          </div>

          {/* Table */}
          <div>
            <div className="flex items-start justify-between mb-6 gap-4">
              <p className="text-sm text-neutral-500 leading-relaxed max-w-sm">
                {category.intro}
              </p>

              {category.kind === "body" && (
                <div className="flex border border-neutral-200 shrink-0">
                  {(["cm", "in"] as Unit[]).map((u) => (
                    <button
                      key={u}
                      onClick={() => setUnit(u)}
                      className={`px-3 py-1.5 text-xs font-sans font-semibold uppercase tracking-wide transition-colors ${
                        unit === u
                          ? "bg-neutral-600 text-white"
                          : "text-neutral-400 hover:text-neutral-600"
                      }`}
                    >
                      {u}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-neutral-200">
                    {category.columns.map((col) => (
                      <th
                        key={col.key}
                        onMouseEnter={() =>
                          col.highlightId && setHoveredColumn(col.highlightId)
                        }
                        onMouseLeave={() => setHoveredColumn(null)}
                        className={`text-left py-3 pr-4 font-sans font-semibold uppercase text-[11px] tracking-[0.08em] whitespace-nowrap transition-colors ${
                          col.highlightId && hoveredColumn === col.highlightId
                            ? "text-primary-500"
                            : "text-neutral-400"
                        } ${col.highlightId ? "cursor-default" : ""}`}
                      >
                        {col.label}
                        {category.kind === "body" &&
                          col.key !== "size" &&
                          col.key !== "cup" &&
                          ` (${unit})`}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {category.rows.map((row, i) => (
                    <tr
                      key={i}
                      className="border-b border-neutral-100 last:border-b-0 hover:bg-neutral-50 transition-colors"
                    >
                      {category.columns.map((col) => {
                        const raw = row[col.key];
                        const display =
                          category.kind === "body" && typeof raw === "number"
                            ? convert(raw, unit)
                            : raw;

                        return (
                          <td
                            key={col.key}
                            className={`py-3.5 pr-4 whitespace-nowrap ${
                              col.key === "size" || col.key === "name"
                                ? "font-medium text-neutral-600"
                                : "text-neutral-500"
                            }`}
                          >
                            {display}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* How to measure */}
        <div className="mt-16 pt-10 border-t border-neutral-100">
          <h2 className="font-serif text-2xl font-medium text-neutral-600 mb-6">
            How to measure
          </h2>
          <div className="grid sm:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Chest & bust",
                body: "Wrap the tape around the fullest point, keeping it level and snug but not tight.",
              },
              {
                step: "2",
                title: "Waist",
                body: "Measure around the narrowest part of your torso, usually just above the navel.",
              },
              {
                step: "3",
                title: "Hips",
                body: "Stand with feet together and measure around the fullest part of your hips.",
              },
            ].map((item) => (
              <div key={item.step}>
                <p className="text-[11px] font-sans font-semibold text-primary-500 mb-2">
                  {item.step}
                </p>
                <h3 className="font-serif text-lg text-neutral-600 mb-1.5">
                  {item.title}
                </h3>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Fit note */}
        <div className="mt-12 p-5 bg-neutral-50 border border-neutral-100">
          <p className="text-xs text-neutral-500 leading-relaxed">
            Between sizes? Our compression styles run true to size; looser fits
            (jackets, joggers) tend to size up. Still unsure —{" "}
            <a
              href="mailto:hello@keesdeen.com"
              className="text-primary-500 hover:text-primary-600 font-medium"
            >
              email us
            </a>{" "}
            your measurements and we&apos;ll point you to the right size.
          </p>
        </div>
      </div>
    </main>
  );
}
