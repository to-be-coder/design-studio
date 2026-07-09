"use client";

import * as React from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CopyButtonProps {
  text: string;
  className?: string;
  ariaLabel?: string;
  /** Optional toast message shown on copy. */
  toastMessage?: string;
}

/**
 * Small icon button that copies `text` to the clipboard and shows a check for
 * ~1.5s. Stops event propagation so it can sit inside a clickable container.
 */
export function CopyButton({ text, className, ariaLabel, toastMessage }: CopyButtonProps) {
  const [copied, setCopied] = React.useState(false);

  const handleClick = React.useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      try {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        if (toastMessage) toast.success(toastMessage);
        window.setTimeout(() => setCopied(false), 1500);
      } catch {
        // clipboard may be unavailable in insecure contexts — silent no-op
      }
    },
    [text, toastMessage],
  );

  return (
    <button
      type="button"
      onClick={handleClick}
      title={copied ? "Copied!" : "Copy"}
      aria-label={ariaLabel ?? `Copy ${text}`}
      className={cn(
        "inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors",
        "text-muted-foreground hover:bg-foreground/10 hover:text-foreground",
        copied && "text-[var(--accent-solid)]",
        className,
      )}
    >
      {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
}
