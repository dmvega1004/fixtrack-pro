"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { clearOfflineCaches } from "@/lib/offline-cache";

export function useLogout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout(): Promise<void> {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      await clearOfflineCaches();
      setIsLoading(false);
      router.push("/login");
      router.refresh();
    }
  }

  return { logout, isLoading };
}
