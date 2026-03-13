import { redirect } from "next/navigation";
import { isAdminAuthenticated } from "@/server/admin/auth";
import { loginAction } from "@/app/admin/actions";

export const dynamic = "force-dynamic";

interface AdminLoginPageProps {
  searchParams?: Promise<{
    error?: string;
  }>;
}

export default async function AdminLoginPage({
  searchParams
}: AdminLoginPageProps) {
  if (await isAdminAuthenticated()) {
    redirect("/admin");
  }

  const params = searchParams ? await searchParams : undefined;
  const showError = params?.error === "invalid_credentials";

  return (
    <main className="page-shell page-shell-narrow">
      <section className="hero admin-login-card">
        <p className="eyebrow">Admin Access</p>
        <h1>Sign in to the desk.</h1>
        <p className="lede">
          Use the local admin username and password to manage AI settings, live
          sources, and editorial analytics.
        </p>

        <form action={loginAction} className="admin-form admin-login-form">
          <label className="admin-field">
            <span>Username</span>
            <input name="username" type="text" autoComplete="username" required />
          </label>

          <label className="admin-field">
            <span>Password</span>
            <input name="password" type="password" autoComplete="current-password" required />
          </label>

          {showError ? (
            <p className="admin-form-error">Username or password was incorrect.</p>
          ) : null}

          <button className="button-link admin-submit-button" type="submit">
            Enter admin
          </button>
        </form>
      </section>
    </main>
  );
}
