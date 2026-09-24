"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  const total = Math.ceil(ms / 1000);
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (value: number) => String(value).padStart(2, "0");
  return hours > 0
    ? `${hours}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

// Counts down from the server's remaining time using the monotonic clock, so
// changing the device clock cannot add time. The server enforces the deadline
// regardless; at zero the page reloads to show the server's state.
export function Countdown({
  remainingMs,
  label,
  expiredLabel,
}: {
  remainingMs: number;
  label: string;
  expiredLabel: string;
}) {
  const [left, setLeft] = useState(remainingMs);

  useEffect(() => {
    const end = performance.now() + remainingMs;
    const timer = window.setInterval(() => {
      const next = Math.max(0, end - performance.now());
      setLeft(next);
      if (next === 0) {
        window.clearInterval(timer);
        window.setTimeout(() => window.location.reload(), 1_500);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [remainingMs]);

  const urgent = left <= 60_000;
  return (
    <p className={urgent ? "countdown countdown--urgent" : "countdown"}>
      <span className="countdown__label">{left > 0 ? label : expiredLabel}</span>
      {left > 0 ? (
        <span className="countdown__value" role="timer" dir="ltr">
          {format(left)}
        </span>
      ) : null}
    </p>
  );
}
