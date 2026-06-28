import Link from "next/link";
import { customerLoginAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default function CustomerLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <>
      <h1>Sign in</h1>
      {searchParams.error ? (
        <p role="alert" style={{ color: "#b00020", fontWeight: 600 }}>
          Invalid email or password.
        </p>
      ) : null}
      <form action={customerLoginAction} style={{ maxWidth: 420 }}>
        <label>
          Email address
          <input type="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" required />
        </label>
        <button type="submit">Sign in</button>
      </form>
      <p>
        New here? <Link href="/account/register">Register</Link>
      </p>
    </>
  );
}
