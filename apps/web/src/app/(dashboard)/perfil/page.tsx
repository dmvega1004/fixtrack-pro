import { getSession, ROLE_LABELS } from "@/lib/session";
import { getMyProfile } from "@/lib/api/users";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogoutButton } from "@/components/shared/logout-button";
import { ChangePasswordForm } from "@/components/profile/change-password-form";
import { MySignatureCard } from "@/components/profile/my-signature-card";

export default async function PerfilPage() {
  const session = await getSession();
  if (!session) return null;

  const profile = await getMyProfile();

  return (
    <div className="flex flex-1 flex-col gap-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold">Perfil</h1>

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1 text-sm">
            <span className="font-medium">{session.email}</span>
            <span className="text-muted-foreground">{ROLE_LABELS[session.role]}</span>
          </div>
          <LogoutButton />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Seguridad</CardTitle>
        </CardHeader>
        <CardContent>
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Mi firma</CardTitle>
        </CardHeader>
        <CardContent>
          <MySignatureCard
            initialDocumentNumber={profile.documentNumber}
            initialSignatureUrl={profile.signatureImageUrl}
          />
        </CardContent>
      </Card>
    </div>
  );
}
