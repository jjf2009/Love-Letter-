export default function Home() {
  return (
    <div className="space-y-10">
      <section className="rounded-3xl bg-white/70 p-8 shadow-sm ring-1 ring-black/5 backdrop-blur">
        <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
          Write a letter. Encrypt it. Share one magic link.
        </h1>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-slate-700">
          This app encrypts your message and images in the browser using AES-GCM.
          The decryption key is stored in the URL fragment, which is never sent in
          HTTP requests.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <a
            href="/create"
            className="inline-flex items-center justify-center rounded-full bg-rose-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
          >
            Create an encrypted letter
          </a>
          <a
            href="https://supabase.com"
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center justify-center rounded-full bg-white px-5 py-3 text-sm font-medium text-slate-800 shadow-sm ring-1 ring-black/5 hover:bg-white/80"
          >
            Set up Supabase
          </a>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-3">
        <FeatureCard title="Client-side encryption">
          Message and images are encrypted before upload.
        </FeatureCard>
        <FeatureCard title="No accounts">
          Anyone can create a letter. Anyone with the link can read it.
        </FeatureCard>
        <FeatureCard title="Magic link">
          Share a single URL. The key stays in `#key=...`.
        </FeatureCard>
      </section>
    </div>
  );
}

function FeatureCard(props: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-white/70 p-5 shadow-sm ring-1 ring-black/5">
      <div className="text-sm font-semibold text-slate-900">{props.title}</div>
      <div className="mt-2 text-sm leading-6 text-slate-700">{props.children}</div>
    </div>
  );
}
