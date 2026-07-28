"use client";

import { Button } from "@/components/ui/button";
import { useLogout } from "@/hooks/use-logout";

export function LogoutButton() {
  const { logout, isLoading } = useLogout();

  return (
    <Button variant="outline" onClick={() => void logout()} disabled={isLoading}>
      {isLoading ? "Cerrando sesión..." : "Cerrar sesión"}
    </Button>
  );
}
