export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-4xl font-semibold tracking-tight">Encrypted Love Letters</h1>
      <p className="mt-4 text-lg text-neutral-700">
        Write a letter, add photos, and share a magic link. The encryption key lives in the URL fragment, so the
        server never sees it.
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <a
          className="inline-flex items-center justify-center rounded-md bg-pink-600 px-4 py-2 text-white"
          href="/create"
        >
          Create a letter
        </a>
        <a
          className="inline-flex items-center justify-center rounded-md border border-neutral-300 px-4 py-2"
          href="https://github.com/jjf2009/Love-Letter-/issues/1"
          target="_blank"
          rel="noreferrer"
        >
          MVP spec
        </a>
      </div>

      <div className="mt-10 rounded-md border border-neutral-200 bg-white p-4 text-sm text-neutral-600">
        Security reminder: anyone with the magic link can decrypt the content.
      </div>
    </main>
  );
}
