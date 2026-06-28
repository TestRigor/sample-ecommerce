import Link from "next/link";

export default function AdminNav() {
  return (
    <header className="admin">
      <strong style={{ fontSize: "1.1rem" }}>Back Office</strong>
      <nav>
        <Link href="/admin">Dashboard</Link>
        <Link href="/admin/orders">Orders</Link>
        <Link href="/admin/products">Products</Link>
        <a href="/logout">Sign out (Logout)</a>
      </nav>
    </header>
  );
}
