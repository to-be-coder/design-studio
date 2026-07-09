import { AlertCircle } from "lucide-react";

export function VaultError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-lg p-8">
      <div className="panel p-6">
        <div className="flex items-start gap-3">
          <AlertCircle className="mt-0.5 h-5 w-5 text-amber-500" />
          <div className="space-y-3 text-sm">
            <h1 className="text-base font-semibold text-foreground">Vault not found</h1>
            <p className="text-muted-foreground">{message}</p>
            <ul className="ml-4 list-disc space-y-1 text-muted-foreground">
              <li>
                Set{" "}
                <code className="rounded bg-foreground/[0.06] px-1 py-0.5">DESIGN_STUDIO_VAULT</code>{" "}
                in <code className="rounded bg-foreground/[0.06] px-1 py-0.5">.env.local</code> to the
                vault&apos;s absolute path, or
              </li>
              <li>
                write that path to{" "}
                <code className="rounded bg-foreground/[0.06] px-1 py-0.5">~/.design-studio-vault</code>{" "}
                (the pointer every design-studio skill uses).
              </li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
