import { AdminSidebar } from "@/components/admin/AdminSidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-[#050d1a] selection:bg-teal-500/30">
      {/* Background effects */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full bg-teal-500/[0.07] blur-[150px]" />
        <div className="absolute bottom-[-10%] left-[-5%] w-[35%] h-[35%] rounded-full bg-blue-600/[0.07] blur-[150px]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:48px_48px]" />
        <div className="noise-overlay absolute inset-0" />
      </div>

      <AdminSidebar />
      <main className="flex-1 overflow-auto relative z-10">
        <div className="mx-auto max-w-6xl p-6 lg:p-8">{children}</div>
      </main>
    </div>
  );
}
