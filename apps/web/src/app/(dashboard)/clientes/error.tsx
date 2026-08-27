"use client";

import { SectionError } from "@/components/shared/section-error";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ClientesError({ error, reset }: Props) {
  return <SectionError error={error} reset={reset} />;
}
