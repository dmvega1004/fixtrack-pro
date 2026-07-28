"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface LoginErrorBody {
  message?: string;
}

export function useLogin() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  async function submitLogin(email: string, password: string): Promise<void> {
    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        const data: LoginErrorBody | null = await response
          .json()
          .catch(() => null);
        toast.error(data?.message ?? "No se pudo iniciar sesión");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      toast.error("No se pudo conectar con el servidor");
    } finally {
      setIsLoading(false);
    }
  }

  return { submitLogin, isLoading };
}
