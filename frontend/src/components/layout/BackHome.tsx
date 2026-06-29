import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export function BackHome() {
  return (
    <Link
      href="/"
      className="inline-flex items-center gap-2 text-sm font-medium text-navy-deep/70 transition-colors hover:text-navy-deep"
    >
      <ArrowLeft className="h-4 w-4" />
      Back to Home
    </Link>
  );
}
