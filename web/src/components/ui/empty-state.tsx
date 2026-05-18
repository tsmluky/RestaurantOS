export function EmptyState({
  title,
  description
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className="px-5 py-10 text-center">
      <div className="text-sm font-semibold text-ink">{title}</div>
      {description ? <div className="mt-1 text-sm text-muted">{description}</div> : null}
    </div>
  );
}
