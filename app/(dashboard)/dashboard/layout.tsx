import { Sidebar } from "@/components/Sidebar";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex bg-canvas">
      <Sidebar />
      <main className="min-h-screen flex-1 overflow-y-auto bg-canvas p-8">
        {children}
      </main>
    </div>
  );
}
