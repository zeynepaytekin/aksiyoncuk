"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { getUser } from "../../lib/auth";
import { useAuth } from "../../context/AuthContext";

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuth();

  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  // Eğer zaten login olmuşsa home'a at
  useEffect(() => {
    const user = getUser();

    if (user) {
      router.push("/home");
    }
  }, [router]);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");

    if (!fullName || !username || !email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    // Context üzerinden login (register sonrası otomatik login)
    login({
      fullName,
      username,
      email,
    });

    router.push("/home");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-100 px-4">
      <div className="w-full max-w-md rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Create Account</h1>
          <p className="mt-2 text-sm text-gray-500">
            Join Aksiyoncuk and build your creative network
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Full Name
            </label>
            <input
              type="text"
              placeholder="Your full name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Username
            </label>
            <input
              type="text"
              placeholder="@username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Password
            </label>
            <input
              type="password"
              placeholder="Create a password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl border border-gray-300 px-4 py-3 outline-none transition focus:border-black"
            />
          </div>

          {error && (
            <p className="text-sm font-medium text-red-500">{error}</p>
          )}

          <button
            type="submit"
            className="w-full rounded-xl bg-black px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90"
          >
            Create Account
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-black">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}