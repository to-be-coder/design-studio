"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Menu, Network, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { ThemeToggle } from "./theme-toggle";
import { LogoMark } from "./logo-mark";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutGrid;
}

const NAV: NavItem[] = [
  { href: "/", label: "Graph", icon: Network },
  { href: "/portfolio", label: "Portfolio", icon: LayoutGrid },
  { href: "/skills", label: "Skills", icon: Sparkles },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/portfolio") return pathname === "/portfolio" || pathname.startsWith("/project");
  return pathname === href || pathname.startsWith(href + "/");
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map((item) => {
        const active = isActive(pathname, item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition-colors duration-150",
              active
                ? "bg-foreground/[0.06] text-foreground"
                : "text-muted-foreground hover:bg-foreground/[0.06] hover:text-foreground",
            )}
          >
            <Icon className={cn("h-4 w-4 shrink-0", active && "accent-text")} />
            <span className="tracking-tight">{item.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand() {
  return (
    <div className="flex items-center gap-2 px-1">
      <LogoMark className="h-7 w-7 text-foreground" />
      <span className="text-sm font-semibold tracking-tight text-foreground">
        Design Studio
      </span>
    </div>
  );
}

export function SideNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* Desktop */}
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 p-4 md:flex">
        <div className="panel relative flex h-full w-full flex-col gap-6 overflow-hidden p-2">
          <div className="relative z-10 px-1 pt-1">
            <Brand />
          </div>
          <div className="relative z-10 flex-1 px-0">
            <NavLinks pathname={pathname} />
          </div>
          <div className="relative z-10 flex items-center justify-between px-2">
            <span className="text-[11px] uppercase tracking-wider text-muted-foreground/70">
              v1
            </span>
            <ThemeToggle />
          </div>
        </div>
      </aside>

      {/* Mobile */}
      <div className="sticky top-0 z-30 flex items-center justify-between gap-2 p-4 md:hidden">
        <Sheet open={open} onOpenChange={setOpen}>
          <SheetTrigger className="panel inline-flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:text-foreground">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Open menu</span>
          </SheetTrigger>
          <SheetContent side="left" className="w-72 p-4">
            <SheetTitle className="sr-only">Navigation</SheetTitle>
            <div className="flex h-full flex-col gap-6">
              <Brand />
              <NavLinks pathname={pathname} onNavigate={() => setOpen(false)} />
            </div>
          </SheetContent>
        </Sheet>
        <Brand />
        <ThemeToggle />
      </div>
    </>
  );
}
