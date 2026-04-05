import Link from "next/link";
import { Train, Car, MapPin, ArrowRight, Shield, Clock, Users } from "lucide-react";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* Hero */}
      <section className="relative flex min-h-[70vh] flex-col items-center justify-center overflow-hidden px-6 text-center">
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-transparent" />
        <div className="pointer-events-none absolute -top-40 left-1/2 h-[500px] w-[800px] -translate-x-1/2 rounded-full bg-primary/8 blur-3xl" />

        <div className="relative z-10 max-w-2xl space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium text-primary">
            <Shield className="h-3 w-3" />
            Beograd · Pametna mobilnost
          </div>

          <h1 className="text-5xl font-extrabold tracking-tight sm:text-6xl">
            GU<span className="text-primary">ZW</span>A
          </h1>

          <p className="mx-auto max-w-lg text-lg text-muted-foreground">
            Smanjite gradske gužve uz železničke rute, deljenje vožnji i prijavu problema na putu — sve na jednom mestu.
          </p>

          <div className="flex items-center justify-center gap-3 pt-2">
            <Link
              href="/map"
              className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all hover:shadow-xl hover:shadow-primary/30 hover:-translate-y-0.5 active:scale-[0.98]"
            >
              Otvori mapu
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-5xl px-6 pb-24">
        <div className="grid gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={Train}
            color="bg-blue-500/10 text-blue-600"
            title="BG Voz rutiranje"
            description="Kombinujte javni prevoz sa vozom — automatski pronalazimo najbržu rutu do stanice i nazad."
          />
          <FeatureCard
            icon={Car}
            color="bg-emerald-500/10 text-emerald-600"
            title="Deljenje vožnji"
            description="Povežite se sa vozačima na istoj ruti. Uštedite gorivo, smanjite gužvu, zaradite bodove."
          />
          <FeatureCard
            icon={MapPin}
            color="bg-amber-500/10 text-amber-600"
            title="Problemi na putu"
            description="Prijavite rupe, blokade i opasnosti. Zajednica potvrđuje — lažni prijave se filtriraju."
          />
        </div>

        {/* Stats */}
        <div className="mt-12 grid grid-cols-3 gap-4 rounded-2xl border bg-card p-6">
          <Stat icon={Train} value="35" label="BG Voz stanica" />
          <Stat icon={Clock} value="50+" label="dnevnih polazaka" />
          <Stat icon={Users} value="3" label="potvrde za problem" />
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-6 text-center text-xs text-muted-foreground">
        GUZWA · FON · Beograd {new Date().getFullYear()}
      </footer>
    </main>
  );
}

function FeatureCard({
  icon: Icon,
  color,
  title,
  description,
}: {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-2xl border bg-card p-6 transition-all duration-300 hover:shadow-lg hover:-translate-y-1">
      <div className={`mb-4 inline-flex h-11 w-11 items-center justify-center rounded-xl ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="text-sm font-semibold">{title}</h3>
      <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}

function Stat({
  icon: Icon,
  value,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: string;
  label: string;
}) {
  return (
    <div className="text-center">
      <Icon className="mx-auto mb-1 h-4 w-4 text-muted-foreground/60" />
      <p className="text-2xl font-bold tracking-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  );
}
