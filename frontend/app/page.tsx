import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-black text-white">
      <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 rounded-full border border-white/20 px-4 py-2 text-sm text-white/70">
          Creative Networking Platform
        </p>

        <h1 className="mb-6 text-5xl font-bold tracking-tight md:text-7xl">
          Aksiyoncuk
        </h1>

        <p className="mb-8 max-w-2xl text-lg leading-8 text-white/70">
          Film ve yaratıcı sektör profesyonelleri için networking, proje paylaşımı,
          freelance fırsatları, crowdfunding ve dağıtım odaklı yeni nesil platform.
        </p>

        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/register"
            className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-black transition hover:opacity-90"
          >
            Get Started
          </Link>

          <Link
            href="/login"
            className="rounded-full border border-white/20 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            Sign In
          </Link>
        </div>
      </section>
    </main>
  );
}