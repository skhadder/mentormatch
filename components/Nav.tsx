"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Icon from "./Icon";
import Logo from "./Logo";

const LINKS = [
  { href: "/find", label: "Find a mentor" },
  { href: "/fair", label: "How this stays fair" },
  { href: "/mentor", label: "Mentor portal" },
  { href: "/requests", label: "My requests" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <header className="border-b border-line bg-background/90 backdrop-blur">
      <nav aria-label="Main" className="wrap flex flex-wrap items-center gap-x-1 gap-y-1 py-2">
        <Link href="/" aria-label="MentorMatch home" className="mr-4 inline-flex min-h-11 items-center">
          <Logo />
        </Link>
        {LINKS.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            aria-current={path === l.href ? "page" : undefined}
            className={`inline-flex min-h-11 items-center rounded-lg px-2.5 text-[13px] hover:text-foreground ${path === l.href ? "font-semibold text-foreground" : "text-muted"}`}
          >
            {l.label}
          </Link>
        ))}
        <Link href="/find" className="btn ml-auto !min-h-10 !px-4 !text-[13px]">
          Find a mentor <Icon name="arrow-up-right" size={13} />
        </Link>
      </nav>
    </header>
  );
}
