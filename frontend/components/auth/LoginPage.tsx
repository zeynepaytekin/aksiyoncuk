"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import FormError from "@/components/ui/FormError";
import FormField from "@/components/ui/FormField";
import Input from "@/components/ui/Input";
import { useAuthStore } from "@/store/auth.store";

export default function LoginPage() {
  const router = useRouter();
  const isLoading = useAuthStore((state) => state.isLoading);
  const login = useAuthStore((state) => state.login);
  const user = useAuthStore((state) => state.user);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isLoading && user) {
      router.push("/home");
    }
  }, [isLoading, router, user]);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    await login({ email });

    router.push("/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <Card padding="none" className="w-full max-w-md p-8">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Welcome Back</h1>
          <p className="mt-2 text-sm text-gray-500">
            Sign in to your Aksiyoncuk account
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <FormField label="Email" htmlFor="login-email">
            <Input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant="auth"
            />
          </FormField>

          <FormField label="Password" htmlFor="login-password">
            <Input
              id="login-password"
              type="password"
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
          >
            Sign In
          </Button>
        </form>

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
