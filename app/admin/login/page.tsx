import { adminLoginAction } from "@/app/actions/auth";

export const dynamic = "force-dynamic";

export default function AdminLoginPage({ searchParams }: { searchParams: { error?: string } }) {
  return (
    <main>
      <h1>Admin sign in</h1>
      {searchParams.error ? (
        <p role="alert" style={{ color: "#b00020", fontWeight: 600 }}>
          Invalid credentials.
        </p>
      ) : null}
      <form action={adminLoginAction} style={{ maxWidth: 420 }}>
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
    </main>
  );
}
