/** Designed state for a missing vault / bad pointer (§14). */
export function VaultError({ message }: { message: string }) {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-8">
      <p className="eyebrow mb-3">No vault</p>
      <h1 className="mb-4 font-serif text-3xl font-semibold tracking-tight text-ink">
        The canvas can&rsquo;t find your design-studio vault.
      </h1>
      <p className="reading mb-6 text-ink-muted">{message}</p>
      <div className="card-sheet p-5 text-[0.8125rem] leading-relaxed text-ink-muted">
        <p className="mb-2">
          The pointer file <code className="font-mono text-ink">~/.design-studio-vault</code> holds
          one line: the absolute path to your vault. Every design-studio skill reads it.
        </p>
        <p>
          Set <code className="font-mono text-ink">DESIGN_STUDIO_VAULT</code> in{" "}
          <code className="font-mono text-ink">web/.env.local</code>, or run{" "}
          <code className="font-mono text-ink">/design-studio-setup</code> to create the pointer.
        </p>
      </div>
    </main>
  );
}
