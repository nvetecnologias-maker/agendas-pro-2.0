import { LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function SignOutButton({ className }: { className?: string }) {
  return (
    <form action="/auth/sair" method="post" className={className}>
      <Button type="submit" variant="ghost" size="sm">
        <LogOut /> Sair
      </Button>
    </form>
  );
}
