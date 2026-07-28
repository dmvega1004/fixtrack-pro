interface PlaceholderSectionProps {
  title: string;
}

export function PlaceholderSection({ title }: PlaceholderSectionProps) {
  return (
    <div className="flex flex-1 flex-col gap-2 p-6">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">En construcción — Bloque 2</p>
    </div>
  );
}
