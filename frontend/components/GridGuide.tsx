"use client";
import { useEffect, useMemo, useRef, useState } from "react";
import { FeederDetail } from "@/lib/api";

export function explain(feeder: FeederDetail | null): string[] {
  if (!feeder) {
    return [
      "Welcome. This map shows Con Edison's distribution grid in New York.",
      "Hosting capacity is how many MW of new solar a feeder can accept before an engineering limit is hit. Pick a feeder and I will read its numbers for you.",
      "The dots are substations. Their locations come from OpenStreetMap, because the utility data does not include them.",
    ];
  }
  const msgs: string[] = [];
  const cap = feeder.pv_thermal_mw;
  const max = feeder.hosting_capacity_max_mw;
  const queued = feeder.queued_der_mw ?? 0;
  const connected = feeder.connected_der_mw ?? 0;

  if (cap != null && max != null && max > 0) {
    const pct = Math.round((cap / max) * 100);
    msgs.push(
      `${feeder.feeder_id} can host about ${cap.toFixed(2)} MW of new solar. That is ${pct}% of its ${max.toFixed(2)} MW best case; the rest is lost to the feeder's tightest engineering constraint.`,
    );
  } else {
    msgs.push(`${feeder.feeder_id} has no published thermal capacity value right now.`);
  }

  if (queued > 0 && cap != null && cap > 0) {
    const ratio = queued / cap;
    if (ratio >= 1) {
      msgs.push(
        `Careful: ${queued.toFixed(2)} MW is already waiting in the interconnection queue, more than the remaining capacity. Projects ahead of you could absorb all of it.`,
      );
    } else if (ratio >= 0.3) {
      msgs.push(
        `${queued.toFixed(2)} MW is queued ahead of you. If those projects connect, remaining room shrinks to roughly ${(cap - queued).toFixed(2)} MW.`,
      );
    } else {
      msgs.push(`The queue is light here: only ${queued.toFixed(2)} MW ahead of you.`);
    }
  } else if (queued === 0) {
    msgs.push("Nothing is waiting in the interconnection queue on this feeder.");
  }

  if (connected > 0) {
    msgs.push(`${connected.toFixed(2)} MW of distributed generation is already connected and operating.`);
  }

  msgs.push(
    `The teal line on the map is the feeder itself, drawn from ${feeder.segment_count} mapped segments. Open "Screening limits" to see which constraint binds.`,
  );
  return msgs;
}

function useTypewriter(text: string, enabled: boolean) {
  const [shown, setShown] = useState(enabled ? "" : text);
  useEffect(() => {
    if (!enabled) {
      setShown(text);
      return;
    }
    setShown("");
    let i = 0;
    const id = setInterval(() => {
      i += 2;
      setShown(text.slice(0, i));
      if (i >= text.length) clearInterval(id);
    }, 14);
    return () => clearInterval(id);
  }, [text, enabled]);
  return shown;
}

export default function GridGuide({ feeder }: { feeder: FeederDetail | null }) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const reduceMotion = useRef(false);

  useEffect(() => {
    reduceMotion.current = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }, []);

  const messages = useMemo(() => explain(feeder), [feeder]);
  useEffect(() => setStep(0), [feeder]);

  const current = messages[Math.min(step, messages.length - 1)];
  const typed = useTypewriter(current, open && !reduceMotion.current);

  return (
    <div className="guide">
      {open && (
        <div className="guide-card" role="log" aria-label="Grid guide">
          <div className="guide-head">
            <span className="guide-title">Grid Guide</span>
            <button className="guide-close" onClick={() => setOpen(false)} aria-label="Close guide">
              &times;
            </button>
          </div>
          <p className="guide-text">{typed}</p>
          <div className="guide-nav">
            <span className="guide-dots">
              {messages.map((_, i) => (
                <i key={i} className={i === Math.min(step, messages.length - 1) ? "on" : ""} />
              ))}
            </span>
            <button
              className="guide-next"
              onClick={() => setStep((s) => (s + 1) % messages.length)}
            >
              {step >= messages.length - 1 ? "Replay" : "Next"}
            </button>
          </div>
        </div>
      )}
      <button
        className="guide-orb"
        onClick={() => setOpen((o) => !o)}
        aria-label={open ? "Hide grid guide" : "Explain this data"}
        title="Explain this data"
      >
        <svg viewBox="0 0 48 48" width="48" height="48" aria-hidden="true">
          <circle className="orb-ring r1" cx="24" cy="24" r="20" fill="none" strokeWidth="1" />
          <circle className="orb-ring r2" cx="24" cy="24" r="14" fill="none" strokeWidth="1" />
          <circle className="orb-core" cx="24" cy="24" r="10" />
          <path
            className="orb-bolt"
            d="M25.03 16.25 L20.38 25.38 L23.48 25.38 L22.97 31.75 L27.62 22.62 L24.52 22.62 Z"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </div>
  );
}
