export function Handle({ handle }: { handle: string }) {
  return <span className="min-w-0 max-w-full break-words font-mono text-sm font-normal text-ink/60">@{handle}</span>;
}
