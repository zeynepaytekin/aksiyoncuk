"use client";

import Image from "next/image";
import Link from "next/link";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import type { FreelanceServiceSummary } from "@/types/freelance";
import { formatMoney } from "@/utils/formatFreelance";

export default function FreelanceServiceCard({
  service,
  onSavedChange,
  isSaving = false,
}: {
  service: FreelanceServiceSummary;
  onSavedChange?: (service: FreelanceServiceSummary, saved: boolean) => void;
  isSaving?: boolean;
}) {
  return (
    <Card className="group h-full overflow-hidden p-0 hover:-translate-y-1 hover:border-[#191815] hover:shadow-[5px_5px_0_#f5a56f]">
      <Link
        href={`/freelance/service?service=${encodeURIComponent(service.id)}`}
        className="block focus-visible:outline-2"
        aria-label={`View ${service.title}`}
      >
        <div className="relative aspect-[16/10] overflow-hidden bg-[#fbd8bf]">
          {service.thumbnailUrl ? (
            <Image
              src={service.thumbnailUrl}
              alt={`${service.title} preview`}
              fill
              className="object-cover"
            />
          ) : (
            <div className="relative flex h-full items-center justify-center overflow-hidden">
              <span className="absolute -left-8 -top-12 h-36 w-36 rounded-full border border-[#191815]/20 bg-[#f7e98b]" />
              <span className="text-5xl transition group-hover:rotate-6 group-hover:scale-110" aria-hidden="true">✦</span>
              <span className="absolute bottom-3 right-4 text-[10px] font-black uppercase tracking-[.16em]">Creative service</span>
            </div>
          )}
        </div>
      </Link>
      <div className="space-y-3 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[.14em] text-[#9a5b36]">
              {service.category.name}
            </p>
            <Link
              href={`/freelance/service?service=${encodeURIComponent(service.id)}`}
              className="mt-2 block break-words text-xl font-black leading-tight tracking-[-.03em] focus-visible:outline-2"
            >
              {service.title}
            </Link>
          </div>
          {onSavedChange && (
            <Button
              type="button"
              size="sm"
              variant={service.isSaved ? "primary" : "secondary"}
              aria-label={service.isSaved ? "Remove from saved services" : "Save service"}
              aria-pressed={service.isSaved}
              isLoading={isSaving}
              disabled={isSaving}
              onClick={() => onSavedChange(service, !service.isSaved)}
            >
              {service.isSaved ? "Saved" : "Save"}
            </Button>
          )}
        </div>
        <p className="text-sm text-gray-600">
          {service.seller.fullName || service.seller.username}
        </p>
        <div className="flex justify-between gap-3 border-t border-[#e4ddd1] pt-3 text-sm">
          <span>
            {service.averageRating === null
              ? "New"
              : `★ ${service.averageRating} (${service.reviewCount})`}
          </span>
          <strong>From {formatMoney(service.lowestPrice, service.currencyCode)}</strong>
        </div>
        <p className="text-xs text-gray-500">
          {service.shortestDeliveryDays
            ? `${service.shortestDeliveryDays} day delivery`
            : "Delivery varies"}{" "}
          · {service.orderCount} completed
        </p>
      </div>
    </Card>
  );
}
