import Card from "@/components/ui/Card";
import type { FreelanceCancellationRequest } from "@/types/freelance";
import { formatMarketplaceDate } from "@/utils/formatFreelance";

export default function FreelanceCancellationHistory({
  requests,
}: {
  requests: FreelanceCancellationRequest[];
}) {
  const resolved = requests.filter((request) => request.status !== "PENDING");
  if (!resolved.length) return null;
  return (
    <>
      {resolved.map((request) => (
        <Card key={request.id} className="min-w-0">
          <strong>
            Cancellation {request.status.toLowerCase()} ·{" "}
            {formatMarketplaceDate(request.resolvedAt ?? request.createdAt)}
          </strong>
          <p className="mt-2 break-words">
            {request.requestedRole} requested: {request.reason}
          </p>
          <p className="mt-1 text-sm text-gray-500">
            Previous status: {request.previousOrderStatus}
            {request.resolverRole
              ? ` · Resolved by ${request.resolverRole.toLowerCase()}`
              : ""}
          </p>
        </Card>
      ))}
    </>
  );
}
