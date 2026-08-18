"use client";

import { useState } from "react";
import { useT, type Dict } from "@/lib/i18n/useT";

const MIN_SEATS = 5;
const MAX_SEATS = 50;
const BASE_PRICE = 25;
const ORIGINAL_BASE_PRICE = 45;
const PRICE_PER_EXTRA_SEAT = 5;

export function enterprisePriceFor(seats: number): number {
  return BASE_PRICE + Math.max(0, seats - MIN_SEATS) * PRICE_PER_EXTRA_SEAT;
}

const STRINGS: Dict<{ seatsLabel: string; perMonth: string }> = {
  tr: { seatsLabel: "kullanıcı", perMonth: "/ay" },
  en: { seatsLabel: "users", perMonth: "/mo" },
};

export default function EnterpriseSeatStepper({
  seats,
  onChange,
}: {
  seats: number;
  onChange: (seats: number) => void;
}) {
  const t = useT(STRINGS);
  const price = enterprisePriceFor(seats);

  return (
    <div>
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-semibold text-white">
          ${price}
          <span className="text-sm font-normal text-zinc-500">{t.perMonth}</span>
        </span>
        {seats === MIN_SEATS && <span className="text-sm text-zinc-600 line-through">${ORIGINAL_BASE_PRICE}</span>}
      </div>

      <div className="mt-4 flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(MIN_SEATS, seats - 1))}
          disabled={seats <= MIN_SEATS}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition-colors hover:border-violet-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="-"
        >
          −
        </button>
        <span className="text-sm text-zinc-300">
          <span className="font-semibold text-white">{seats}</span> {t.seatsLabel}
        </span>
        <button
          type="button"
          onClick={() => onChange(Math.min(MAX_SEATS, seats + 1))}
          disabled={seats >= MAX_SEATS}
          className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-700 text-zinc-300 transition-colors hover:border-violet-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
          aria-label="+"
        >
          +
        </button>
      </div>
    </div>
  );
}
