"use client";

import { useCallback, useState } from "react";

export function CopyButton(props: { value: string; className?: string }) {
  const [status, setStatus] = useState<"idle" | "copied" | "error">("idle");

  const onCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(props.value);
      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 1200);
    } catch {
      setStatus("error");
      window.setTimeout(() => setStatus("idle"), 1500);
    }
  }, [props.value]);

  const label = status === "copied" ? "Copied" : status === "error" ? "Copy failed" : "Copy";

  return (
    <button
      type="button"
      onClick={onCopy}
      className={
        props.className ??
        "inline-flex items-center justify-center rounded-full bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
      }
    >
      {label}
    </button>
  );
}
