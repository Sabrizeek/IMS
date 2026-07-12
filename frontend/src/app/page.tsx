import {
  GraduationCap,
  Building2,
  UserPlus,
  TrendingUp,
  BookOpen,
  FileText,
  ShieldCheck,
  Lock,
} from "lucide-react";
import { LandingNav } from "@/components/layout/LandingNav";
import { Footer } from "@/components/layout/Footer";
import { LinkButton } from "@/components/ui/Button";

const features = [
  {
    icon: UserPlus,
    title: "Automated Registration",
    body: "Self-service onboarding for companies and students with automated document verification and academic eligibility checks.",
  },
  {
    icon: TrendingUp,
    title: "GPA-based Recommendations",
    body: "Our intelligent algorithm matches students to elite opportunities based on academic performance and skill relevance.",
  },
  {
    icon: BookOpen,
    title: "Digital Record Book",
    body: "Real-time logging of internship evolution with digital supervisor signatures and university review.",
  },
  {
    icon: FileText,
    title: "Efficient Reporting",
    body: "Generate comprehensive evaluation reports and internship completion certificates with a single click.",
  },
];

export default function Home() {
  return (
    <>
      <LandingNav />

      {/* Hero */}
      <section
        id="overview"
        className="text-white"
        style={{
          backgroundImage:
            "linear-gradient(rgba(15,32,67,0.85), rgba(15,32,67,0.85)), url('/intern.jpg')",
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }}
      >
        <div className="mx-auto max-w-5xl px-6 py-20 text-center">
          <h1 className="text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">
            Welcome to the Internship Management System
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-base text-white/80 sm:text-lg">
            A unified platform connecting students, departments, and industry
            partners to streamline every step of the internship journey.
          </p>

          <div className="mx-auto mt-12 grid max-w-3xl gap-6 md:grid-cols-2">
            <PortalCard
              icon={<GraduationCap className="h-6 w-6 text-navy" />}
              title="Student Portal"
              body="Register as a student to apply for internships, track your placements, and maintain your digital record book."
              cta="Get Started"
              href="/student/auth"
              variant="primary"
            />
            <PortalCard
              icon={<Building2 className="h-6 w-6 text-navy" />}
              title="Department Portal"
              body="Manage student placements, oversee internal approvals, and monitor the overall internship program success."
              cta="Login"
              href="/department/auth"
              variant="dark"
            />
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="bg-sky-soft">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 py-5 text-sm text-navy-deep/80">
          <span className="font-medium">Trusted By</span>
          <span className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-amber-500" />
            University of Ruhuna
          </span>
          <span className="hidden text-navy-deep/30 sm:inline">|</span>
          <span className="flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Secure Portal
          </span>
        </div>
      </section>

      {/* Features */}
      <section className="bg-feature-bg">
        <div className="mx-auto max-w-6xl px-6 py-16">
          <h2 className="text-center text-3xl font-bold text-navy-deep">
            Centralized Internship process
          </h2>
          <p className="mx-auto mt-3 max-w-2xl text-center text-navy-deep/70">
            Streamlining collaboration between all stakeholders with an
            integrated, data-driven platform.
          </p>

          <div className="mt-12 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {features.map(({ icon: Icon, title, body }) => (
              <div
                key={title}
                className="rounded-xl border-t-4 border-navy-deep bg-white/60 p-5 shadow-sm backdrop-blur"
              >
                <Icon className="h-6 w-6 text-navy-deep" />
                <h3 className="mt-4 font-semibold text-navy-deep">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-deep/70">
                  {body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Gateway */}
      <section className="bg-white">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <h2 className="text-3xl font-bold text-navy-deep sm:text-4xl">
              Your gateway to professional excellence.
            </h2>
            <p className="mt-6 leading-relaxed text-foreground/70">
              Empowering departments to oversee and manage internship programs
              with ease. Our Student Internship Management System simplifies
              internship tracking, record management, progress monitoring, and
              communication, ensuring a smooth internship experience for
              students.
            </p>
            <div className="mt-8">
              <LinkButton href="/student/auth">Get Started</LinkButton>
            </div>
          </div>
          <div className="flex aspect-[4/3] items-center justify-center overflow-hidden rounded-2xl shadow-lg">
            <img src="/analytics.jpg" alt="Analytics" className="h-full w-full object-cover" />
          </div>
        </div>
      </section>

      <Footer />
    </>
  );
}

function PortalCard({
  icon,
  title,
  body,
  cta,
  href,
  variant,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: string;
  href: string;
  variant: "primary" | "dark";
}) {
  return (
    <div className="flex flex-col rounded-2xl bg-white/95 p-7 text-left text-foreground shadow-lg">
      <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-sky-soft">
        {icon}
      </div>
      <h3 className="text-center text-xl font-bold text-navy-deep">{title}</h3>
      <p className="mt-3 text-center text-sm leading-relaxed text-foreground/70">
        {body}
      </p>
      <LinkButton href={href} variant={variant} className="mt-6 w-full">
        {cta}
      </LinkButton>
    </div>
  );
}
