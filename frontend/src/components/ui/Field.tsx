import type { ComponentProps } from "react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

const fieldBase =
  "w-full rounded-lg border border-black/10 bg-white px-4 py-3 text-sm text-foreground placeholder:text-muted/70 shadow-sm focus:outline-none focus:ring-2 focus:ring-accent/50 focus:border-accent/50";

export function Label({ children, ...props }: ComponentProps<"label">) {
  return (
    <label className="mb-1.5 block text-sm font-medium text-navy-deep" {...props}>
      {children}
    </label>
  );
}

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cx(fieldBase, className)} {...props} />;
}

export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cx(fieldBase, "cursor-pointer", className)} {...props}>
      {children}
    </select>
  );
}

export function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
