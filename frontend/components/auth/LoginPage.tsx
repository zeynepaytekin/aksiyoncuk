"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { getAuthErrorMessage } from "@/services/api/authErrorMessage";
import { useAuthStore } from "@/store/auth.store";
import { isDemoMode } from "@/services/api/apiClient";

export default function LoginPage() {
  const router = useRouter();
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const status = useAuthStore((state) => state.status);
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);
  const enterDemoSession = useAuthStore((state) => state.enterDemoSession);

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isInitialized && status === "authenticated" && user) {
      router.replace("/home");
    }
  }, [isInitialized, router, status, user]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!identifier.trim() || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      await login({ identifier, password });
      setPassword("");
      router.push("/home");
    } catch (submitError) {
      setPassword("");
      setError(getAuthErrorMessage(submitError));
    }
  }

  return (
    <main className="brand-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute left-[8%] top-[14%] hidden rotate-[-8deg] rounded-full border border-[#191815] bg-[#f7e98b] px-5 py-3 text-sm font-bold shadow-[3px_3px_0_#191815] md:block">ideas live here ✦</div>
      <div className="absolute bottom-[12%] right-[8%] hidden h-28 w-28 rotate-12 rounded-[35%_65%_55%_45%] border border-[#191815] bg-[#fbd8bf] md:block" />
      <Card padding="none" className="relative w-full max-w-md border-[#191815] p-8 shadow-[7px_7px_0_#f5a56f]">
        <div className="mb-8 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-[.16em] text-[#a05e37]">Come on in</p>
          <h1 className="display-type text-5xl text-[#191815]">Welcome back.</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to your Aksiyoncuk account
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Email or username" htmlFor="login-identifier">
            <Input
              id="login-identifier"
              type="text"
              autoComplete="username"
              placeholder="you@example.com or username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              variant="auth"
            />
          </FormField>

          <FormField label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              variant="auth"
            />
          </FormField>

          <FormError message={error} />

          <Button
            type="submit"
            size="auth"
            className="w-full transition"
            isLoading={isLoading}
            loadingText="Signing in…"
            disabled={isLoading}
          >
            Sign In
          </Button>
        </form>

        {isDemoMode && (
          <div className="mt-6 border-t border-gray-200 pt-6">
            <Button
              type="button"
              variant="secondary"
              size="auth"
              className="w-full"
              onClick={() => {
                enterDemoSession();
                router.push("/home");
              }}
            >
              Try the interactive demo
            </Button>
            <p className="mt-2 text-center text-xs text-gray-500">
              Uses fictional, in-memory data. No credentials or backend connection.
            </p>
          </div>
        )}

        <p className="mt-6 text-center text-sm text-gray-500">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-semibold text-black">
            Register
          </Link>
        </p>
      </Card>
    </main>
  );
}
