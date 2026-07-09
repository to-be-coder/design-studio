import type { ReactNode } from "react";
import { ExternalLink } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  right?: ReactNode;
  /** When set, the title links out (e.g. a prototype repo). */
  href?: string;
}

export function PageHeader({ title, subtitle, right, href }: PageHeaderProps) {
  const titleNode = href ? (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="group/title inline-flex items-center gap-2 text-foreground transition-colors hover:accent-text"
    >
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      <ExternalLink className="h-5 w-5 opacity-60 transition group-hover/title:opacity-100" />
    </a>
  ) : (
    <h1 className="text-3xl font-semibold tracking-tight text-foreground">{title}</h1>
  );

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        {titleNode}
        {subtitle ? (
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  );
}
