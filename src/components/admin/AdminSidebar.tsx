"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  ShoppingCart,
  KeyRound,
  Tags,
  HardDrive,
  Users,
  Rocket,
  LogOut,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navItems = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/licenses", label: "Licences", icon: KeyRound },
  { href: "/admin/discounts", label: "Codes promo", icon: Tags },
  { href: "/admin/plugins", label: "Plugins", icon: HardDrive },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/roadmap", label: "Teasing / Roadmap", icon: Rocket },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <aside className="w-60 shrink-0 border-r border-border/50 bg-card/50 backdrop-blur-sm flex flex-col h-screen sticky top-0">
      <div className="p-5 border-b border-border/50">
        <Link href="/admin" className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-sm font-bold text-primary-foreground">BV</span>
          </div>
          <div>
            <span className="font-semibold text-sm text-foreground">BVFactory</span>
            <span className="ml-1.5 text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
              Admin
            </span>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-3 space-y-0.5">
        <p className="px-3 py-2 text-[10px] font-semibold text-muted-foreground uppercase tracking-wider">
          Navigation
        </p>
        {navItems.map(({ href, label, icon: Icon }) => {
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all",
                isActive
                  ? "bg-primary/10 text-primary font-medium shadow-sm"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
            >
              <Icon className={cn(
                "w-4 h-4 transition-colors",
                isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
              )} />
              <span className="flex-1">{label}</span>
              {isActive && <ChevronRight className="w-3 h-3 text-primary/50" />}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-border/50">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 text-muted-foreground hover:text-destructive"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </Button>
      </div>
    </aside>
  );
}
