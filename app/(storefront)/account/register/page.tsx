import Link from "next/link";
import { registerAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default function RegisterPage({ searchParams }: { searchParams: { error?: string } }) {
  const errorMsg =
    searchParams.error === "exists"
      ? "An account with that email already exists."
      : searchParams.error === "missing"
        ? "Email and password are required."
        : null;

  return (
    <>
      <h1>Create an account</h1>
      {errorMsg ? (
        <p role="alert" style={{ color: "#b00020", fontWeight: 600 }}>
          {errorMsg}
        </p>
      ) : null}
      <form action={registerAction} style={{ maxWidth: 420 }}>
        <label>
          Full Name
          <input type="text" name="name" />
        </label>
        <label>
          Email address
          <input type="email" name="email" required />
        </label>
        <label>
          Password
          <input type="password" name="password" required />
        </label>
        <button type="submit">Create account</button>
      </form>
      <p>
        Already have an account? <Link href="/account/login">Sign in</Link>
      </p>
    </>
  );
}
