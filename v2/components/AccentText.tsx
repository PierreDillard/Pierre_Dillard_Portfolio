export function AccentText({ title, accent }: { title: string; accent: string }) {
  const start = accent ? title.indexOf(accent) : -1;
  if (start < 0) return title;

  return <>{title.slice(0, start)}<em>{accent}</em>{title.slice(start + accent.length)}</>;
}
