"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { APP_NAME } from "@/lib/brand";

export default function LoginPage() {
  const router = useRouter();
  const [loginId, setLoginId] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email: loginId,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid phone/email or password");
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-xs uppercase tracking-widest text-muted">
            {APP_NAME}
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-charcoal">Welcome back</h1>
          <p className="mt-2 text-sm text-muted">
            Sign in to manage your team attendance
          </p>
        </div>

        <form onSubmit={handleSubmit} className="card space-y-4">
          {error && (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-absent">
              {error}
            </div>
          )}

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Phone or Email
            </label>
            <input
              type="text"
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              className="input-field"
              placeholder="9876543210 or admin@example.com"
              required
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input-field pr-12"
                placeholder="Enter password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm">
            <label className="flex items-center gap-2 text-muted">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="rounded"
              />
              Remember me
            </label>
            <span className="text-muted">Forgot password?</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Login"}
          </button>
        </form>

        {process.env.NODE_ENV === "development" && (
          <div className="mt-6 rounded-2xl bg-surface p-4 text-xs text-muted">
            <p className="font-medium text-charcoal">Demo accounts</p>
            <p className="mt-2">Master Admin: admin@example.com / admin123</p>
            <p>Manager: 9876543210 / manager123</p>
          </div>
        )}
      </div>
    </div>
  );
}
