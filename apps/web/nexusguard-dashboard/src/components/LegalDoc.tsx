"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";

export interface LegalSection {
  id: string;
  label: string;
  body: React.ReactNode;
}

export default function LegalDoc({
  title,
  updatedLabel,
  intro,
  sections,
}: {
  title: string;
  updatedLabel: string;
  intro: React.ReactNode;
  sections: LegalSection[];
}) {
  const [activeId, setActiveId] = useState(sections[0]?.id);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActiveId(entry.target.id);
        }
      },
      { rootMargin: "-15% 0px -70% 0px" }
    );

    for (const s of sections) {
      const el = sectionRefs.current[s.id];
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [sections]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <div className="flex items-center gap-3">
        <Logo className="h-8 w-8" />
        <h1 className="text-3xl font-semibold text-white sm:text-4xl">{title}</h1>
      </div>
      <p className="mt-2 text-sm text-zinc-500">Son güncelleme: {updatedLabel}</p>

      <div className="mt-10 grid grid-cols-1 gap-12 lg:grid-cols-[1fr_240px]">
        <div>
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">{intro}</p>

          <div className="mt-10 space-y-12">
            {sections.map((s, i) => (
              <section
                key={s.id}
                id={s.id}
                ref={(el) => {
                  sectionRefs.current[s.id] = el;
                }}
                className="scroll-mt-24"
              >
                <h2 className="text-lg font-semibold text-white">
                  {i + 1}. {s.label}
                </h2>
                <div className="mt-3 max-w-2xl space-y-3 text-sm leading-relaxed text-zinc-400">{s.body}</div>
              </section>
            ))}
          </div>
        </div>

        <aside className="hidden lg:block">
          <div className="sticky top-24">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-zinc-500">
              <MenuIcon className="h-3.5 w-3.5" />
              Bu sayfada
            </div>
            <nav className="mt-3 space-y-1 border-l border-zinc-800">
              {sections.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  className={`block border-l-2 py-1 pl-3 text-sm transition-colors ${
                    activeId === s.id
                      ? "border-violet-500 font-medium text-violet-300"
                      : "border-transparent text-zinc-500 hover:text-zinc-300"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </div>
        </aside>
      </div>
    </div>
  );
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={className}>
      <path d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}
