"use client";

import { useRef, useState } from "react";
import Logo from "@/components/Logo";
import { checkScanPin } from "@/lib/api";
import { useT, type Dict } from "@/lib/i18n/useT";

const STRINGS: Dict<{
  brand: string;
  title: string;
  subtitle: string;
  download: string;
  checking: string;
  invalidPin: string;
  noPinTitle: string;
  noPinBody: string;
}> = {
  tr: {
    brand: "NexusGuard",
    title: "Scanner'ı indir",
    subtitle: "Sunucu yöneticinizden aldığınız 6 haneli PIN kodunu girin.",
    download: "Tarayıcıyı İndir",
    checking: "Kontrol ediliyor...",
    invalidPin: "Geçersiz ya da süresi dolmuş PIN. Sunucu yöneticinizden yeni bir tane isteyin.",
    noPinTitle: "Henüz PIN kodunuz yok mu?",
    noPinBody:
      "Sunucu yöneticiniz dashboard'dan yeni bir tarama oluşturduğunda PIN'i size iletir. PIN'ler 24 saat geçerlidir ve tek kullanımlıktır.",
  },
  en: {
    brand: "NexusGuard",
    title: "Download the Scanner",
    subtitle: "Enter the 6-digit PIN you got from your server admin.",
    download: "Download Scanner",
    checking: "Checking...",
    invalidPin: "Invalid or expired PIN. Ask your server admin for a new one.",
    noPinTitle: "Don't have a PIN yet?",
    noPinBody:
      "Your server admin sends you a PIN when they create a new scan from the dashboard. PINs are valid for 24 hours and single-use.",
  },
};

const DIGIT_COUNT = 6;

type Status = "idle" | "checking" | "invalid";

export default function PinDownloadCard() {
  const t = useT(STRINGS);
  const [digits, setDigits] = useState<string[]>(Array(DIGIT_COUNT).fill(""));
  const [status, setStatus] = useState<Status>("idle");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  const pin = digits.join("");
  const complete = pin.length === DIGIT_COUNT;

  function setDigitAt(index: number, value: string) {
    const clean = value.replace(/\D/g, "").slice(-1);
    const next = [...digits];
    next[index] = clean;
    setDigits(next);
    setStatus("idle");
    if (clean && index < DIGIT_COUNT - 1) {
      inputs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace" && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, DIGIT_COUNT);
    if (!pasted) return;
    e.preventDefault();
    const next = Array(DIGIT_COUNT).fill("");
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i];
    setDigits(next);
    setStatus("idle");
    inputs.current[Math.min(pasted.length, DIGIT_COUNT - 1)]?.focus();
  }

  async function handleDownloadClick() {
    setStatus("checking");
    try {
      const valid = await checkScanPin(pin);
      if (!valid) {
        setStatus("invalid");
        return;
      }
      window.location.href = `/api/download-scanner?pin=${pin}`;
      setStatus("idle");
    } catch {
      // The API being unreachable shouldn't strand the player on a spinner forever - let them
      // try again rather than claiming a definite "invalid" verdict we don't actually have.
      setStatus("idle");
    }
  }

  const invalid = status === "invalid";
  const checking = status === "checking";

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6 backdrop-blur">
      <div className="flex items-center gap-2">
        <Logo className="h-6 w-6" />
        <span className="text-sm font-semibold text-white">{t.brand}</span>
      </div>

      <h3 className="mt-5 text-lg font-semibold text-white">{t.title}</h3>
      <p className="mt-1 text-sm text-zinc-400">{t.subtitle}</p>

      <div className="mt-5 flex justify-between gap-1.5 sm:gap-2">
        {digits.map((d, i) => (
          <input
            key={i}
            ref={(el) => {
              inputs.current[i] = el;
            }}
            value={d}
            onChange={(e) => setDigitAt(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            onPaste={handlePaste}
            inputMode="numeric"
            maxLength={1}
            aria-label={`PIN digit ${i + 1}`}
            className={`h-12 w-full min-w-0 rounded-lg border bg-zinc-950 text-center text-lg font-semibold text-white outline-none focus:border-violet-600 ${
              invalid ? "border-red-800" : "border-zinc-700"
            }`}
          />
        ))}
      </div>

      {invalid && <p className="mt-3 text-xs text-red-400">{t.invalidPin}</p>}

      <button
        type="button"
        onClick={handleDownloadClick}
        disabled={!complete || checking}
        className={`mt-5 flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2.5 text-sm font-medium transition-colors ${
          complete && !checking
            ? "bg-violet-600 text-white hover:bg-violet-500"
            : "cursor-not-allowed bg-violet-600/40 text-white/60"
        }`}
      >
        ⬇ {checking ? t.checking : t.download}
      </button>

      <p className="mt-4 text-xs leading-relaxed text-zinc-500">
        <span className="text-zinc-400">{t.noPinTitle}</span> {t.noPinBody}
      </p>
    </div>
  );
}
