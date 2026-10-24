"use client";

import { useState } from "react";
import Icon from "./Icon";

export default function CopyButton({ text, label = "Copy message" }: { text: string; label?: string }) {
  const [state, setState] = useState<"idle" | "done" | "error">("idle");
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setState("done");
    } catch {
      setState("error");
    }
    setTimeout(() => setState("idle"), 2000);
  }
  return (
    <button type="button" className="btn btn-secondary" onClick={copy}>
      <Icon name="copy" size={14} />
      {state === "done" ? "Copied" : state === "error" ? "Couldn't copy. Select the text instead." : label}
    </button>
  );
}
