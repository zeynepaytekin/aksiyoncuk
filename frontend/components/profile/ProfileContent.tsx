"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { getJobs, Job } from "../../lib/jobs";
import { getWorks, Work } from "../../lib/works";

type ProfilePost = {
  id: number;
  author: string;
  content: string;
  createdAt: string;
  likes: number;
  comments: unknown[];
  userEmail: string;
};

export default function ProfileContent() {
  const { user } = useAuth();
  const [myPosts, setMyPosts] = useState<ProfilePost[]>([]);
  const [myWorks, setMyWorks] = useState<Work[]>([]);
  const [myJobs, setMyJobs] = useState<Job[]>([]);

  useEffect(() => {
    if (!user?.email) return;

    const storedPosts = localStorage.getItem("aksiyoncuk_posts");

    if (storedPosts) {
      const allPosts = JSON.parse(storedPosts) as ProfilePost[];
      setMyPosts(allPosts.filter((post) => post.userEmail === user.email));
    }

    const allWorks = getWorks();
    setMyWorks(allWorks.filter((work) => work.userEmail === user.email));

    const allJobs = getJobs();
    setMyJobs(allJobs.filter((job) => job.userEmail === user.email));
  }, [user]);

  return (
    <section className="space-y-6 lg:col-span-8">
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {["Works", "Jobs Posted", "Feed", "Crowdfunding"].map((item) => (
          <button
            key={item}
            className="rounded-2xl border border-gray-200 bg-white p-5 text-sm font-semibold shadow-sm hover:bg-gray-50"
          >
            {item}
          </button>
        ))}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Works</h2>
          <Link
            href="/works/create"
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Add Work
          </Link>
        </div>

        {myWorks.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz portfolio işi eklemedin.</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {myWorks.map((work) => (
              <div
                key={work.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="mb-3 h-36 rounded-xl bg-gray-200" />
                <h3 className="font-semibold">{work.title}</h3>
                <p className="mt-1 text-sm text-gray-500">{work.type}</p>
                <p className="mt-2 text-sm leading-6 text-gray-600">
                  {work.description}
                </p>
                <p className="mt-2 text-xs text-gray-400">{work.createdAt}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Jobs Posted</h2>
          <Link
            href="/jobs/create"
            className="rounded-full bg-black px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
          >
            Add Job
          </Link>
        </div>

        {myJobs.length === 0 ? (
          <p className="text-sm text-gray-500">
            Henüz iş/proje ilanı eklemedin.
          </p>
        ) : (
          <div className="space-y-4">
            {myJobs.map((job) => (
              <div
                key={job.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="mb-2 flex items-start justify-between gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">
                      {job.title}
                    </h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {job.category} · {job.location}
                    </p>
                  </div>

                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-700">
                    Open
                  </span>
                </div>

                <p className="text-sm leading-6 text-gray-600">
                  {job.description}
                </p>
                <p className="mt-2 text-xs text-gray-400">{job.createdAt}</p>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">My Posts</h2>

        {myPosts.length === 0 ? (
          <p className="text-sm text-gray-500">Henüz post paylaşmadın.</p>
        ) : (
          <div className="space-y-4">
            {myPosts.map((post) => (
              <div
                key={post.id}
                className="rounded-xl border border-gray-200 p-4"
              >
                <div className="mb-2">
                  <p className="text-sm font-semibold text-gray-900">
                    {post.author}
                  </p>
                  <p className="text-xs text-gray-400">{post.createdAt}</p>
                </div>

                <p className="text-sm leading-6 text-gray-700">
                  {post.content}
                </p>

                <div className="mt-3 flex gap-4 text-xs text-gray-500">
                  <span>Likes: {post.likes}</span>
                  <span>Comments: {post.comments?.length || 0}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h2 className="mb-4 text-lg font-bold">Crowdfunding</h2>

        <div className="rounded-xl border border-gray-200 p-4">
          <h3 className="font-semibold">Independent Film Campaign</h3>
          <p className="mt-2 text-sm leading-6 text-gray-600">
            Bağımsız film projesi için destek kampanyası. Destekçiler erken
            izleme, özel etkinlik ve teşekkür kredisi kazanabilir.
          </p>

          <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
            <div className="h-full w-2/3 rounded-full bg-black" />
          </div>

          <div className="mt-2 flex justify-between text-sm text-gray-500">
            <span>₺66,000 raised</span>
            <span>₺100,000 goal</span>
          </div>

          <button className="mt-4 rounded-full bg-black px-5 py-2 text-sm font-semibold text-white hover:opacity-90">
            Donate
          </button>
        </div>
      </section>
    </section>
  );
}