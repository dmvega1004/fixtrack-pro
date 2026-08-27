"use client";

import { SectionError } from "@/components/shared/section-error";

interface Props {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ClienteDetalleError({ error, reset }: Props) {
  return <SectionError error={error} reset={reset} />;
}
