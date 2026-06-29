import Link from "next/link";

const platformLinks = ["About System", "Features", "Contact"];
const portalLinks = ["Student Portal", "Admin Portal"];
const resources = ["User Guide", "Help Center", "FAQ"];

export function Footer() {
  return (
    <footer className="mt-auto bg-navy-deep text-white/80">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-4">
        <div>
          <h3 className="mb-3 text-lg font-bold text-white">Platform</h3>
          <ul className="space-y-2 text-sm">
            {platformLinks.map((link) => (
              <li key={link}>
                <a href="#" className="hover:text-white">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-base font-semibold text-white">Portals</h4>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/student/login" className="hover:text-white">
                Student Portal
              </Link>
            </li>
            <li>
              <Link href="/department/auth" className="hover:text-white">
                Department Portal
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-base font-semibold text-white">Resources</h4>
          <ul className="space-y-2 text-sm">
            {resources.map((link) => (
              <li key={link}>
                <a href="#" className="hover:text-white">
                  {link}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="mb-3 text-base font-semibold text-white">Contact</h4>
          <p className="max-w-xs text-sm leading-relaxed text-white/70">
            Reach out for support, account recovery, or general platform
            questions.
          </p>
        </div>
      </div>

      <div className="border-t border-white/10 bg-navy py-4">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-2 px-6 text-xs text-white/70 md:flex-row md:items-center md:justify-between">
          <p>© 2026 Internship Management System. All Rights Reserved.</p>
          <div className="flex flex-wrap gap-4">
            {resources.map((link) => (
              <a key={link} href="#" className="hover:text-white">
                {link}
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
