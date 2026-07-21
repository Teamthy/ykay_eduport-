import Header from "@/components/Header";
import Footer from "@/components/Footer";

export default function StatusPage() {
  return (
    <>
      <Header />
      <main className="bg-[#0D0D0D] min-h-screen">
        <section className="relative w-full bg-[#0D0D0D] pt-32 pb-12 md:pt-40 md:pb-16">
          <div className="mx-auto max-w-3xl px-6 text-center">
            <p className="font-body text-xs font-bold tracking-[0.25em] uppercase text-white/30 mb-4">APPLICATION STATUS</p>
            <h1 className="font-display text-[56px] md:text-[100px] lg:text-[130px] leading-[0.85] tracking-[4px] text-white mb-6">CHECK STATUS</h1>
            <p className="font-body text-base md:text-lg text-white/50 max-w-lg mx-auto">Enter your Application ID to view the current status of your admission application.</p>
          </div>
        </section>

        <section className="w-full bg-[#0D0D0D] pb-20 md:pb-32">
          <div className="mx-auto max-w-md px-6">
            <form onSubmit={(e) => { e.preventDefault(); const input = (e.target as HTMLFormElement).querySelector('input')?.value; if (input) { window.location.href = `/api/admissions/status?id=${encodeURIComponent(input)}`; } }} className="space-y-4">
              <label htmlFor="appId" className="font-body text-xs font-bold tracking-[0.25em] uppercase text-white/30">Application ID</label>
              <input
                id="appId"
                name="appId"
                type="text"
                placeholder="YKC-APP-2025-XXXX"
                className="w-full rounded-xl border border-white/10 bg-white/5 px-6 py-4 font-body text-sm text-white placeholder:text-white/20 focus:outline-none focus:border-ykay-green/50 transition-colors"
              />
              <button
                type="submit"
                className="w-full rounded-full px-8 py-4 font-body text-sm font-bold tracking-[0.15em] uppercase bg-ykay-green text-white hover:bg-ykay-green-dark transition-all duration-300"
              >
                Check Status
              </button>
            </form>
            <p className="font-body text-xs text-white/20 mt-6 text-center">Example: YKC-APP-2025-0047</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
