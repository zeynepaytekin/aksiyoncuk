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

export default function RegisterPage() {
  const router = useRouter();
  const isLoading = useAuthStore((state) => state.isLoading);
  const isInitialized = useAuthStore((state) => state.isInitialized);
  const register = useAuthStore((state) => state.register);
  const status = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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

    if (!fullName || !username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    try {
      await register({ fullName, username, email, password });
      setPassword("");
      router.push("/home");
    } catch (submitError) {
      setPassword("");
      setError(getAuthErrorMessage(submitError));
    }
  }

  return (
    <main className="brand-canvas relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute left-[7%] top-[15%] hidden rotate-[-7deg] rounded-[1.5rem] border border-[#191815] bg-[#fbd8bf] px-5 py-4 text-sm font-bold shadow-[4px_4px_0_#191815] md:block">meet → make → share</div>
      <Card padding="none" className="relative w-full max-w-md border-[#191815] p-8 shadow-[7px_7px_0_#f7e98b]">
        <div className="mb-8 text-center">
          <p className="mb-3 text-xs font-black uppercase tracking-[.16em] text-[#a05e37]">Join the scene</p>
          <h1 className="display-type text-5xl text-[#191815]">Make your corner.</h1>
          <p className="mt-2 text-sm text-gray-500">
            Join Aksiyoncuk and build your creative network
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Full Name" htmlFor="register-full-name">
            <Input
              id="register-full-name"
              type="text"
              autoComplete="name"
              maxLength={100}
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              variant="auth"
            />
          </FormField>

          <FormField label="Username" htmlFor="register-username">
            <Input
              id="register-username"
              type="text"
              autoComplete="username"
              minLength={3}
              maxLength={30}
              pattern="[A-Za-z0-9._-]+"
              title="Use 3–30 letters, numbers, periods, underscores, or hyphens."
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              variant="auth"
            />
          </FormField>

          <FormField label="Email" htmlFor="register-email">
            <Input
              id="register-email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="auth"
            />
          </FormField>

          <FormField label="Password" htmlFor="register-password">
            <Input
              id="register-password"
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={72}
              placeholder="Create a password"
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
            loadingText="Creating account…"
            disabled={isLoading}
          >
            Create Account
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-black">
            Sign In
          </Link>
        </p>
      </Card>
    </main>
  );
}
