import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router";
import { adapter, notifyDataChanged } from "../data/adapter";
import { forgetJoined } from "../data/joined";
import { ButtonLink } from "./Button";
import { Icon, Logo } from "./Icon";
import { useToast } from "./Toast";

const NAV = [
  { to: "/explore", label: "Explore" },
  { to: "/my-launches", label: "My launches" },
  { to: "/how-it-works", label: "How it works" },
];

function useDemoReset() {
  const toast = useToast();
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  return {
    busy,
    reset: async () => {
      setBusy(true);
      try {
        await adapter.resetDemo();
        forgetJoined("portfolio-night");
        notifyDataChanged();
        toast("Demo reset — Maya and Jordan are in, one seat open");
        if (location.pathname.includes("/portfolio-night/confirmed")) navigate("/g/portfolio-night");
      } finally {
        setBusy(false);
      }
    },
  };
}

function DemoMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const { busy, reset } = useDemoReset();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        className="btn btn-outline btn-mono btn-sm text-muted hover:text-text"
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((o) => !o)}
      >
        Demo mode
      </button>
      {open && (
        <div
          role="dialog"
          aria-label="Demo controls"
          className="toast absolute right-0 top-[calc(100%+10px)] w-[320px] panel-glass p-5 shadow-2xl shadow-black/70 z-50"
        >
          <p className="eyebrow text-muted mb-3 flex items-center gap-2">
            <span className="dot" /> Isolated demo dataset
          </p>
          <p className="text-[15px] text-muted leading-relaxed">
            Every figure here is a <span className="text-text">demo commitment</span>. No card is charged and no
            notifications are sent.
          </p>
          <button
            type="button"
            className="btn btn-outline btn-sm w-full mt-5"
            disabled={busy}
            onClick={async () => {
              await reset();
              setOpen(false);
            }}
          >
            <Icon name="refresh" size={16} />
            {busy ? "Resetting…" : "Reset AI Portfolio Night"}
          </button>
          <p className="mt-3 text-[13px] text-dim leading-snug">
            Restores Maya and Jordan and opens a fresh 45-minute window.
          </p>
        </div>
      )}
    </div>
  );
}

export function Header() {
  const [menu, setMenu] = useState(false);
  const { pathname } = useLocation();
  const { busy, reset } = useDemoReset();
  useEffect(() => setMenu(false), [pathname]);
  useEffect(() => {
    document.body.style.overflow = menu ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [menu]);

  return (
    <>
    <header className="sticky top-0 z-40 h-[var(--header-h)] bg-ink/80 backdrop-blur-md supports-[backdrop-filter]:bg-ink/65 border-b border-transparent">
      <div className="wrap h-full grid grid-cols-[1fr_auto] lg:grid-cols-[1fr_auto_1fr] items-center gap-6">
        <Link to="/" className="justify-self-start text-text rounded-sm" aria-label="Quorum home">
          <Logo />
        </Link>

        <nav aria-label="Primary" className="hidden lg:flex items-center gap-14">
          {NAV.map((n) => (
            <NavLink key={n.to} to={n.to} className="nav-link">
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden lg:flex justify-self-end items-center gap-5">
          <DemoMenu />
          <ButtonLink to="/create" arrow="up-right" size="sm">
            Create a launch
          </ButtonLink>
        </div>

        <button
          type="button"
          className="lg:hidden justify-self-end grid place-items-center size-11 -mr-2 text-text"
          aria-label={menu ? "Close menu" : "Open menu"}
          aria-expanded={menu}
          aria-controls="mobile-menu"
          onClick={() => setMenu((m) => !m)}
        >
          <Icon name={menu ? "close" : "menu"} size={22} />
        </button>
      </div>
    </header>

      {/* rendered outside <header>: its backdrop-filter would otherwise become the fixed overlay's containing block */}
      {menu && (
        <div
          id="mobile-menu"
          className="lg:hidden fixed inset-x-0 top-[var(--header-h)] bottom-0 bg-ink/97 backdrop-blur-xl route-enter z-40 overflow-y-auto"
        >
          <nav aria-label="Mobile" className="wrap pt-6 pb-10 flex flex-col">
            {[{ to: "/", label: "Home" }, ...NAV].map((n, i) => (
              <NavLink
                key={n.to}
                to={n.to}
                end={n.to === "/"}
                className="rise flex items-center justify-between py-5 border-b border-line text-[28px] font-light tracking-[-0.02em] aria-[current=page]:text-text text-muted"
                style={{ ["--i" as string]: i }}
              >
                {n.label}
                <Icon name="arrowRight" size={20} />
              </NavLink>
            ))}
            <ButtonLink to="/create" arrow="up-right" className="mt-8 w-full">
              Create a launch
            </ButtonLink>
            <div className="mt-10 panel p-5">
              <p className="eyebrow text-muted mb-2 flex items-center gap-2">
                <span className="dot" /> Demo mode
              </p>
              <p className="text-[15px] text-muted">Demo commitments only. No money moves.</p>
              <button type="button" className="btn btn-outline btn-sm w-full mt-4" disabled={busy} onClick={reset}>
                <Icon name="refresh" size={16} />
                {busy ? "Resetting…" : "Reset AI Portfolio Night"}
              </button>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
