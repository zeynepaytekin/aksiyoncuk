import type { MediaListItem } from "@/types/media";

type Props = { media?: MediaListItem[]; alt: string; compact?: boolean };
export default function MediaGallery({ media = [], alt, compact = false }: Props) {
  const ordered = [...media].sort(
    (left, right) => left.displayOrder - right.displayOrder || left.id.localeCompare(right.id),
  );
  if (!ordered.length) return null;
  return (
    <div className={`mt-4 grid gap-1 overflow-hidden rounded-xl ${ordered.length === 1 ? "grid-cols-1" : "grid-cols-2"}`}>
      {ordered.map((item, index) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={item.id} src={item.url} alt={`${alt}, image ${index + 1}`}
          loading={index === 0 ? "eager" : "lazy"}
          className={`w-full bg-gray-100 object-cover ${compact ? "h-36" : ordered.length === 1 ? "max-h-[32rem]" : "h-48"}`} />
      ))}
    </div>
  );
}
