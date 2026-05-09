"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  ShoppingCart,
  KeyRound,
  Tags,
  HardDrive,
  Users,
  Rocket,
  Settings,
  LogOut,
  ChevronRight,
  Mail,
  BarChart2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  badgeKey?: "messages";
}

const navItems: NavItem[] = [
  { href: "/admin", label: "Tableau de bord", icon: LayoutDashboard },
  { href: "/admin/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/admin/orders", label: "Commandes", icon: ShoppingCart },
  { href: "/admin/messages", label: "Messages", icon: Mail, badgeKey: "messages" },
  { href: "/admin/licenses", label: "Licences", icon: KeyRound },
  { href: "/admin/discounts", label: "Codes promo", icon: Tags },
  { href: "/admin/plugins", label: "Plugins", icon: HardDrive },
  { href: "/admin/clients", label: "Clients", icon: Users },
  { href: "/admin/roadmap", label: "Teasing / Roadmap", icon: Rocket },
  { href: "/admin/settings", label: "Paramètres", icon: Settings },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  useEffect(() => {
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const res = await fetch("/api/admin/messages?status=nouveau&offset=0", {
          credentials: "include",
        });
        if (!res.ok) return;
        const { unreadCount } = await res.json();
        if (!cancelled) setUnreadMessages(unreadCount ?? 0);
      } catch {
        // silent
      }
    };
    fetchUnread();
    const id = setInterval(fetchUnread, 30000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.push("/admin/login");
  };

  return (
    <aside className="w-64 shrink-0 border-r border-white/5 bg-[#0a1628]/80 backdrop-blur-xl flex flex-col h-screen sticky top-0 z-20">
      {/* Top accent line */}
      <div className="h-[1px] bg-gradient-to-r from-transparent via-teal-500/40 to-transparent" />

      {/* Logo */}
      <div className="p-5 border-b border-white/5">
        <Link href="/admin" className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-teal-500 to-blue-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <span className="text-sm font-bold text-white font-mono">BV</span>
          </div>
          <div>
            <span className="text-sm font-bold tracking-[0.15em] uppercase font-mono text-white">
              BVFactory
            </span>
            <p className="text-[9px] text-teal-500/70 uppercase font-mono tracking-[0.3em]">
              Administration
            </p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-0.5 overflow-y-auto">
        <p className="px-3 py-2 text-[9px] font-mono font-semibold text-slate-500 uppercase tracking-[0.2em]">
          Navigation
        </p>
        {navItems.map((item) => {
          const { href, label, icon: Icon, badgeKey } = item;
          const isActive =
            href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(href);
          const showBadge = badgeKey === "messages" && unreadMessages > 0;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-all duration-300",
                isActive
                  ? "bg-gradient-to-r from-teal-500/15 to-blue-600/10 text-teal-400 border border-teal-500/20 shadow-sm shadow-teal-500/5"
                  : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors duration-300",
                  isActive
                    ? "text-teal-400"
                    : "text-slate-500 group-hover:text-slate-300"
                )}
              />
              <span className="flex-1">{label}</span>
              {showBadge && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-teal-500 text-[10px] font-mono font-bold text-[#050d1a]">
                  {unreadMessages > 99 ? "99+" : unreadMessages}
                </span>
              )}
              {isActive && !showBadge && (
                <ChevronRight className="w-3 h-3 text-teal-500/50" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-white/5">
        <button
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-slate-500 hover:text-red-400 hover:bg-red-500/5 transition-all duration-300 border border-transparent hover:border-red-500/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
          Déconnexion
        </button>
      </div>
    </aside>
  );
}
