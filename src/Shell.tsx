import { useEffect } from "react";
import { Link, Outlet, ScrollRestoration, useLocation } from "react-router";
import { Header } from "./components/Header";
import { Icon } from "./components/Icon";
import { ToastProvider } from "./components/Toast";

const TITLES: [RegExp, string][] = [
  [/^\/$/, "Quorum — Good things start with a few"],
  [/^\/explore/, "Explore gatherings — Quorum"],
  [/^\/create/, "Create a launch — Quorum"],
  [/^\/my-launches/, "My launches — Quorum"],
  [/^\/how-it-works/, "How it works — Quorum"],
];

export function Shell() {
  const { pathname } = useLocation();
  useEffect(() => {
    const t = TITLES.find(([re]) => re.test(pathname));
    if (t) document.title = t[1];
  }, [pathname]);

  return (
    <ToastProvider>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:z-[95] focus:top-3 focus:left-3 btn btn-primary btn-sm"
      >
        Skip to content
      </a>
      <Header />
      <main id="main" key={pathname} className="route-enter min-h-[calc(100svh-var(--header-h))]">
        <Outlet />
      </main>
      <ScrollRestoration />
    </ToastProvider>
  );
}

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="wrap py-7 flex flex-col md:flex-row md:items-center gap-4 md:gap-8 text-[15px]">
        <p className="flex items-center gap-3 text-text">
          <Icon name="shield" size={24} className="text-muted" />
          Only pay when the gathering is confirmed.
        </p>
        <span className="hidden md:block h-6 w-px bg-line" aria-hidden="true" />
        <p className="text-dim font-mono text-[13px] tracking-[0.02em]">Demo offers · No real charges</p>
        <nav className="md:ml-auto flex flex-wrap gap-x-6 text-muted text-[14.5px]" aria-label="Footer">
          <Link to="/explore" className="hover:text-text min-h-11 inline-flex items-center">Explore</Link>
          <Link to="/my-launches" className="hover:text-text min-h-11 inline-flex items-center">My launches</Link>
          <Link to="/how-it-works" className="hover:text-text min-h-11 inline-flex items-center">How it works</Link>
          <Link to="/create" className="hover:text-text min-h-11 inline-flex items-center">Create a launch</Link>
        </nav>
      </div>
    </footer>
  );
}
