"use client";

import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { logout } from "@/features/auth/actions";
import { clearUserDrafts } from "@/lib/drafts/local-draft";

export function LogoutForm({
  userId,
  compact = false,
}: {
  userId: string;
  compact?: boolean;
}) {
  return (
    <form
      action={logout}
      onSubmit={() => clearUserDrafts(userId)}
      className={compact ? "lg:hidden" : undefined}
    >
      <Button
        variant="ghost"
        size={compact ? "icon" : undefined}
        className={
          compact ? undefined : "mt-2 w-full justify-start px-2 text-xs"
        }
        type="submit"
        aria-label={compact ? "Cerrar sesión" : undefined}
      >
        <LogOut />
        {!compact && "Cerrar sesión"}
      </Button>
    </form>
  );
}
