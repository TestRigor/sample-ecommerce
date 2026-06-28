// No guard here so /admin/login renders without a redirect loop.
// Each protected page calls requireAdmin() itself.
export const dynamic = "force-dynamic";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
