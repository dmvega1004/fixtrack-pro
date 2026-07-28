"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function useLogout() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function logout(): Promise<void> {
    setIsLoading(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setIsLoading(false);
      router.push("/login");
      router.refresh();
    }
  }

  return { logout, isLoading };
}
