import Image from "next/image";
import Link from "next/link";
import Card from "@/components/ui/Card";
import type { FreelanceServiceWork } from "@/types/freelance";

export default function ServicePortfolioWorks({
  works,
}: {
  works: FreelanceServiceWork[];
}) {
  if (!works.length) return <p className="text-gray-500">No portfolio works linked.</p>;
  return works.map((work) => (
    <Link key={work.id} href={`/works/view?id=${encodeURIComponent(work.id)}`}>
      <Card padding="none" className="h-full overflow-hidden">
        {work.thumbnailUrl ? (
          <div className="relative aspect-video bg-gray-100">
            <Image
              src={work.thumbnailUrl}
              alt={`${work.title} portfolio thumbnail`}
              fill
              className="object-cover"
            />
          </div>
        ) : (
          <div className="flex aspect-video items-center justify-center bg-gray-100 text-sm text-gray-400">
            No work image
          </div>
        )}
        <p className="break-words p-4 font-semibold">{work.title}</p>
      </Card>
    </Link>
  ));
}
