"use client";

export type AuthMode = "signup" | "login";

export function AuthTabs({
  mode,
  onChange,
}: {
  mode: AuthMode;
  onChange: (mode: AuthMode) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-1 rounded-xl bg-black/5 p-1">
      <TabButton active={mode === "signup"} onClick={() => onChange("signup")}>
        Sign Up
      </TabButton>
      <TabButton active={mode === "login"} onClick={() => onChange("login")}>
        Login
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-lg py-2.5 text-sm font-semibold transition-colors ${
        active
          ? "bg-navy-deep text-white shadow-sm"
          : "text-navy-deep/70 hover:text-navy-deep"
      }`}
    >
      {children}
    </button>
  );
}
