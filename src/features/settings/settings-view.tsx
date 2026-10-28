import Link from "next/link";
import { Bike, Globe2, Layers2, ReceiptText, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ProfileForm } from "@/features/settings/profile-form";
import { RucForm } from "@/features/settings/ruc-form";
import { VehicleForm } from "@/features/settings/vehicle-form";
import { DeleteAccountForm } from "@/features/settings/delete-account-form";
import { PlatformManager } from "@/features/shifts/platform-manager";
import type { getAccount } from "@/features/settings/queries";

type Account = Awaited<ReturnType<typeof getAccount>>;

export function SettingsView({ account }: { account?: Account }) {
  return (
    <>
      <p className="mb-2 text-xs text-muted-foreground">
        Tu espacio, a tu manera
      </p>
      <h1 className="mb-7 text-3xl font-bold tracking-tight">Configuración</h1>
      <div className="max-w-5xl space-y-5 pb-24 md:pb-8">
        <div className="grid gap-5 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserRound size={18} />
                Mi perfil
              </CardTitle>
            </CardHeader>
            <CardContent>
              {account ? (
                <ProfileForm
                  name={account.profile.display_name}
                  email={account.user.email ?? ""}
                />
              ) : (
                <>
                  <p className="mb-5 text-sm leading-6 text-muted-foreground">
                    Crea tu cuenta para guardar tu perfil y mantener tus
                    registros privados.
                  </p>
                  <Button asChild>
                    <Link href="/signup">Crear cuenta</Link>
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike size={18} />
                Mi vehículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              {account ? (
                <VehicleForm vehicle={account.vehicle} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Crea una cuenta para registrar tu vehículo.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ReceiptText size={18} />
                Datos de comprobantes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {account ? (
                <RucForm ruc={account.settings.ruc} />
              ) : (
                <p className="text-sm text-muted-foreground">
                  Crea una cuenta para guardar tus datos.
                </p>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe2 size={18} />
                Preferencias iniciales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl className="space-y-4 text-sm">
                <Row label="Moneda" value="Soles · PEN" />
                <Row label="Zona horaria" value="America/Lima" />
              </dl>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Layers2 size={18} />
              Plataformas
            </CardTitle>
          </CardHeader>
          <CardContent>
            {account ? (
              <PlatformManager platforms={account.platforms} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Crea una cuenta para administrar tus plataformas.
              </p>
            )}
          </CardContent>
        </Card>
        {account && (
          <Card className="border-destructive/25">
            <CardHeader>
              <CardTitle className="text-destructive">
                Zona de peligro
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-5 text-sm leading-6 text-muted-foreground">
                Si ya no deseas usar Rinde, puedes eliminar tu cuenta y tus
                registros.
              </p>
              <DeleteAccountForm />
            </CardContent>
          </Card>
        )}
      </div>
    </>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-wrap justify-between gap-2 border-b border-border pb-3 last:border-0">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xs font-semibold">{value}</dd>
    </div>
  );
}
