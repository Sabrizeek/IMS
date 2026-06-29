import Link from "next/link";
import type { ComponentProps } from "react";

type Variant = "primary" | "dark" | "outline";

const base =
  "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-3 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/60 disabled:opacity-60 disabled:cursor-not-allowed";

const variants: Record<Variant, string> = {
  primary: "bg-navy text-white hover:bg-navy-700",
  dark: "bg-navy-deep text-white hover:bg-navy-deep-700",
  outline: "border border-navy/30 text-navy hover:bg-navy/5",
};

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant };

export function Button({
  variant = "primary",
  className,
  ...props
}: ButtonProps) {
  return (
    <button className={cx(base, variants[variant], className)} {...props} />
  );
}

type LinkButtonProps = ComponentProps<typeof Link> & { variant?: Variant };

export function LinkButton({
  variant = "primary",
  className,
  ...props
}: LinkButtonProps) {
  return <Link className={cx(base, variants[variant], className)} {...props} />;
}
