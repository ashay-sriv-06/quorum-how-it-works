import type { SVGProps } from "react";

const paths = {
  arrowUpRight: <path d="M7 17 17 7M8 7h9v9" />,
  arrowRight: <path d="M4 12h15m-6-6 6 6-6 6" />,
  arrowLeft: <path d="M20 12H5m6-6-6 6 6 6" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.8-3.8" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="1.5" />
      <path d="M3.5 10h17M8 3v4m8-4v4" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  pin: (
    <>
      <path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11Z" />
      <circle cx="12" cy="10" r="2.3" />
    </>
  ),
  dollar: <path d="M12 3v18m4.5-14.5c-1-1-2.5-1.5-4.5-1.5-2.5 0-4 1.2-4 3s1.5 2.6 4 3.2 4.5 1.4 4.5 3.3-1.8 3.2-4.5 3.2c-2.2 0-3.9-.7-5-2" />,
  user: (
    <>
      <circle cx="12" cy="8" r="3.8" />
      <path d="M4.5 20c.8-3.8 3.8-5.8 7.5-5.8s6.7 2 7.5 5.8" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8.5" r="3.3" />
      <path d="M2.8 19.5c.6-3.3 3.1-5 6.2-5s5.6 1.7 6.2 5M15.5 5.4a3.3 3.3 0 0 1 0 6.3M17.6 14.7c2 .6 3.3 2.2 3.7 4.8" />
    </>
  ),
  video: (
    <>
      <rect x="3" y="6.5" width="12.5" height="11" rx="1.5" />
      <path d="m15.5 10.5 5.5-3v9l-5.5-3" />
    </>
  ),
  link: <path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1" />,
  check: <path d="m5 12.5 4.5 4.5L19 7.5" />,
  shield: (
    <>
      <path d="M12 3 4.5 6v5.5c0 4.6 3.1 8.2 7.5 9.5 4.4-1.3 7.5-4.9 7.5-9.5V6Z" />
      <path d="m8.8 12 2.3 2.3 4.2-4.3" />
    </>
  ),
  plus: <path d="M12 4.5v15M4.5 12h15" />,
  menu: <path d="M4 8h16M4 16h16" />,
  close: <path d="m6 6 12 12M18 6 6 18" />,
  download: <path d="M12 4v11m-5-5 5 5 5-5M5 20h14" />,
  info: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 11v5.5M12 7.8v.2" />
    </>
  ),
  refresh: <path d="M19.5 12a7.5 7.5 0 1 1-2.2-5.3M19.5 4.5v4h-4" />,
  sparkle: <path d="M12 3v5m0 8v5M3 12h5m8 0h5M6 6l2.8 2.8m6.4 6.4L18 18M18 6l-2.8 2.8m-6.4 6.4L6 18" />,
} as const;

export type IconName = keyof typeof paths;

export function Icon({ name, size = 18, className, ...rest }: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
      {...rest}
    >
      {paths[name]}
    </svg>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-3 ${className ?? ""}`}>
      <svg width="30" height="28" viewBox="0 0 30 28" aria-hidden="true">
        <path d="M15 5.5 6 21.5h18Z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="15" cy="5.5" r="4" fill="currentColor" />
        <circle cx="6" cy="21.5" r="4" fill="currentColor" />
        <circle cx="24" cy="21.5" r="4" fill="currentColor" />
      </svg>
      <span className="text-[25px] font-normal tracking-[-0.03em] leading-none -mt-[3px]">quorum</span>
    </span>
  );
}
