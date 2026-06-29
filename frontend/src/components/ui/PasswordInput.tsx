"use client";

import { useState, type ComponentProps } from "react";
import { Eye, EyeOff } from "lucide-react";

function cx(...parts: Array<string | undefined | false>) {
  return parts.filter(Boolean).join(" ");
}

type Props = Omit<ComponentProps<"input">, "type"> & {
  inputClassName?: string;
};

/** Password field with an inline show/hide toggle. */
export function PasswordInput({ inputClassName, className, ...props }: Props) {
  const [visible, setVisible] = useState(false);

  return (
    <div className={cx("relative", className)}>
      <input
        type={visible ? "text" : "password"}
        className={cx(
          "w-full rounded-lg border border-white/40 bg-white/5 px-4 py-3 pr-12 text-sm text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-periwinkle/60",
          inputClassName,
        )}
        {...props}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        className="absolute inset-y-0 right-2 my-2 flex w-9 items-center justify-center rounded-md bg-white/85 text-navy-deep transition-colors hover:bg-white"
      >
        {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}
