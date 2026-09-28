import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";
import { Icon } from "./Icon";

type Variant = "primary" | "outline" | "outline-cobalt" | "quiet";
type Arrow = "up-right" | "right" | "left" | "none";

interface Common {
  variant?: Variant;
  arrow?: Arrow;
  size?: "md" | "sm";
  icon?: ReactNode;
  className?: string;
  children: ReactNode;
}

const cls = (variant: Variant, size: "md" | "sm", className?: string) =>
  ["btn", `btn-${variant}`, size === "sm" && "btn-sm", className].filter(Boolean).join(" ");

function Arrowhead({ arrow }: { arrow: Arrow }) {
  if (arrow === "none") return null;
  const name = arrow === "up-right" ? "arrowUpRight" : arrow === "right" ? "arrowRight" : "arrowLeft";
  return <Icon name={name} size={16} className={`arrow arrow-${arrow === "up-right" ? "ur" : arrow === "right" ? "r" : "l"}`} />;
}

export function Button({
  variant = "primary",
  arrow = "none",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: Common & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button type="button" className={cls(variant, size, className)} {...rest}>
      {arrow === "left" && <Arrowhead arrow="left" />}
      {icon}
      <span className="u">{children}</span>
      {arrow !== "left" && <Arrowhead arrow={arrow} />}
    </button>
  );
}

export function ButtonLink({
  variant = "primary",
  arrow = "none",
  size = "md",
  icon,
  className,
  children,
  ...rest
}: Common & Omit<LinkProps, "className" | "children">) {
  return (
    <Link className={cls(variant, size, className)} {...rest}>
      {arrow === "left" && <Arrowhead arrow="left" />}
      {icon}
      <span className="u">{children}</span>
      {arrow !== "left" && <Arrowhead arrow={arrow} />}
    </Link>
  );
}
