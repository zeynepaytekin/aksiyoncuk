import Link from "next/link";

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

export default function LandingPage() {
  return (
    <main className="brand-canvas min-h-screen overflow-hidden text-[#191815]">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-6 sm:px-8">
        <Link href="/" className="flex items-center gap-3 font-bold">
          <span className="flex h-11 w-11 rotate-[-4deg] items-center justify-center rounded-[40%_60%_45%_55%] border border-[#191815] bg-[#f5a56f] text-xl shadow-[3px_3px_0_#191815]">A</span>
          <span className="text-lg tracking-[-.04em]">aksiyoncuk</span>
        </Link>
        <div className="flex items-center gap-2">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-bold hover:bg-[#f7e98b]">Sign in</Link>
          <Link href="/register" className="rounded-full border border-[#191815] bg-[#fffdf8] px-4 py-2 text-sm font-bold shadow-[2px_2px_0_#191815] hover:-translate-y-0.5">Join the community</Link>
        </div>
      </nav>

      <section className="relative mx-auto grid min-h-[calc(100vh-92px)] max-w-7xl items-center gap-8 px-5 pb-16 pt-8 sm:px-8 lg:grid-cols-[1.02fr_.98fr] lg:py-12">
        <div className="relative z-10 max-w-3xl">
          <div className="mb-7 inline-flex rotate-[-2deg] items-center gap-2 rounded-full border border-[#191815] bg-[#f7e98b] px-4 py-2 text-xs font-bold uppercase tracking-[.16em] shadow-[2px_2px_0_#191815]">
            <span className="text-base">✦</span> Ideas, meet action
          </div>
          <h1 className="display-type text-[clamp(4.2rem,10vw,8.4rem)]">
            Make things.<br />
            <span className="relative inline-block italic">Together.</span>
          </h1>
          <div className="mt-3 w-56 squiggle" aria-hidden="true" />
          <p className="mt-8 max-w-xl text-lg leading-8 text-[#5f5a52] sm:text-xl">
            A warm corner of the internet where creative people find each other,
            share unfinished ideas, and turn a tiny spark into something real.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-4">
            {isDemoMode && (
              <Link href="/login" className="action-spark rounded-full border border-[#191815] bg-[#191815] px-7 py-4 text-sm font-bold text-white shadow-[4px_4px_0_#f5a56f] hover:-translate-y-1 hover:shadow-[6px_6px_0_#f5a56f]">
                Try Interactive Demo <span aria-hidden="true">→</span>
              </Link>
            )}
            <Link href="/freelance" className="rounded-full border border-[#191815] bg-[#fffdf8] px-6 py-4 text-sm font-bold hover:bg-[#f7e98b]">
              Browse creative work
            </Link>
          </div>
          <p className="mt-5 flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#7b756b]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#f5a56f]" /> No polished portfolio required
          </p>
        </div>

        <div className="relative mx-auto h-[600px] w-full max-w-[600px] lg:h-[680px]" aria-label="A glimpse inside Aksiyoncuk">
          <div className="absolute left-[4%] top-[2%] w-[78%] rotate-[-2deg] rounded-[2rem] border border-[#191815] bg-[#fffdf8] p-5 shadow-[7px_7px_0_#191815] transition hover:rotate-0">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 items-center justify-center rounded-[45%_55%_60%_40%] border border-[#191815] bg-[#f7e98b] font-bold">O</span>
              <div><p className="font-bold">Olivia Reed</p><p className="text-xs text-[#777067]">Independent Producer · Berlin</p></div>
              <span className="ml-auto rounded-full bg-[#fbd8bf] px-3 py-1 text-[10px] font-bold uppercase tracking-wider">post</span>
            </div>
            <p className="mt-5 text-[15px] leading-6">We just wrapped the final sound mix. Small coastal story, huge-hearted crew. <span className="font-bold">#IndependentFilm</span></p>
            <div className="mt-5 flex gap-5 border-t border-[#ddd5c8] pt-3 text-xs font-bold"><span>♥ 47 sparks</span><span>2 replies</span></div>
          </div>

          <div className="absolute right-[0%] top-[35%] z-20 w-[72%] rotate-[3deg] rounded-[1.7rem] border border-[#191815] bg-[#fbd8bf] p-5 shadow-[6px_6px_0_#191815] transition hover:rotate-1">
            <div className="mb-4 flex items-center justify-between"><span className="rounded-full border border-[#191815] bg-[#fffdf8] px-3 py-1 text-[10px] font-bold uppercase tracking-wider">Open opportunity</span><span className="text-lg">↗</span></div>
            <h2 className="text-xl font-black leading-tight">Cinematographer for a tiny, ambitious short</h2>
            <p className="mt-2 text-sm text-[#594739]">One-day exterior shoot · Bucharest</p>
            <div className="mt-5 flex gap-2 text-[10px] font-bold uppercase tracking-wider"><span className="rounded-full bg-[#191815] px-3 py-1.5 text-white">On site</span><span className="rounded-full border border-[#191815] px-3 py-1.5">6 applicants</span></div>
          </div>

          <div className="absolute bottom-[2%] left-[0%] z-10 w-[68%] rotate-[-4deg] rounded-[1.7rem] border border-[#191815] bg-[#f7e98b] p-5 shadow-[6px_6px_0_#191815] transition hover:rotate-[-2deg]">
            <p className="text-[10px] font-bold uppercase tracking-[.16em]">New message · Noah</p>
            <p className="mt-3 font-bold leading-snug">“I’ll share the first trailer assembly on Thursday.”</p>
            <div className="mt-4 flex items-center justify-between text-xs"><span>10:05</span><span className="rounded-full bg-[#f5a56f] px-3 py-1 font-bold">Reply →</span></div>
          </div>

          <div className="gentle-float absolute right-[4%] top-[7%] z-30 rounded-full border border-[#191815] bg-[#f5a56f] px-4 py-3 text-xs font-bold shadow-[3px_3px_0_#191815]">3 new connections ✦</div>
          <div className="absolute bottom-[7%] right-[4%] h-20 w-20 rotate-12 rounded-[35%_65%_55%_45%] border border-[#191815] bg-[#fffdf8] text-center text-4xl leading-[5rem] shadow-[4px_4px_0_#f5a56f]" aria-hidden="true">↗</div>
        </div>
      </section>
    </main>
  );
}
