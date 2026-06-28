import Link from "next/link";
import { getCartCount } from "@/lib/cart";
import { getSessionUser } from "@/lib/auth";
import SearchBox from "./SearchBox";

export const dynamic = "force-dynamic";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const count = await getCartCount();
  const user = await getSessionUser();

  return (
    <>
      <header className="site">
        <Link href="/" style={{ fontWeight: 700, fontSize: "1.15rem" }}>
          Sample Store
        </Link>
        <SearchBox />
        <nav>
          <Link href="/account">Account</Link>
          <Link href="/cart">Cart ({count})</Link>
          <Link href="/admin/login">Admin</Link>
          {user ? <a href="/logout">Sign out (Logout)</a> : null}
        </nav>
      </header>
      <main>{children}</main>
    </>
  );
}
