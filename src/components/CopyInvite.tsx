import { useEffect, useState } from "react";
import { copyText } from "../lib/files";
import { Icon } from "./Icon";

export function CopyInvite({ slug, className = "" }: { slug: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const id = window.setTimeout(() => setCopied(false), 2000);
    return () => window.clearTimeout(id);
  }, [copied]);

  return (
    <button
      type="button"
      className={`group inline-flex items-center gap-3 min-h-11 text-[15px] text-muted hover:text-text transition-colors duration-150 ${className}`}
      onClick={async () => {
        if (await copyText(`${window.location.origin}/g/${slug}`)) setCopied(true);
      }}
    >
      <span className="relative inline-grid size-[18px]">
        <Icon
          name="link"
          size={18}
          className={`col-start-1 row-start-1 transition-all duration-150 ${copied ? "opacity-0 scale-75" : "opacity-100"}`}
        />
        <Icon
          name="check"
          size={18}
          className={`col-start-1 row-start-1 text-cobalt-hi transition-all duration-150 ${copied ? "opacity-100" : "opacity-0 scale-75"}`}
        />
      </span>
      <span aria-live="polite">{copied ? "Link copied" : "Copy invite link"}</span>
    </button>
  );
}
