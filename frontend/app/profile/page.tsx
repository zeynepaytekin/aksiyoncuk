"use client";

import Navbar from "../../components/layout/Navbar";
import ProfileContent from "../../components/profile/ProfileContent";
import ProfileHeader from "../../components/profile/ProfileHeader";
import ProfileSidebar from "../../components/profile/ProfileSidebar";
import { useAuth } from "../../context/AuthContext";

export default function ProfilePage() {
  const { user } = useAuth();

  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Navbar />

      <section className="mx-auto max-w-6xl px-4 py-6">
        <ProfileHeader user={user} />

        <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-12">
          <ProfileSidebar />
          <ProfileContent />
        </div>
      </section>
    </main>
  );
}