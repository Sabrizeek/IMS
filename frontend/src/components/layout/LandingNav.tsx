import Link from "next/link";

const links = [
  { label: "Overview", href: "#overview" },
  { label: "Academic Performance", href: "/student/auth" },
  { label: "Student CV", href: "/student/auth" },
  { label: "Internship Status", href: "/student/auth" },
  { label: "Record Book", href: "/student/auth" },
];

export function LandingNav() {
  return (
    <header className="sticky top-0 z-50 bg-navy-deep text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-wide">
          <img src="/logo.jpg" alt="IMS Logo" className="h-8 w-auto object-contain" />
          IMS
        </Link>
        <ul className="hidden items-center gap-7 text-sm text-white/80 md:flex">
          {links.map((l) => (
            <li key={l.label}>
              <Link href={l.href} className="transition-colors hover:text-white">
                {l.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
