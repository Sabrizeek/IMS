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
    <header className="bg-navy-deep text-white">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="text-xl font-bold tracking-wide">
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
