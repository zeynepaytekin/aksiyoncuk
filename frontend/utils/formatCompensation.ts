import type { Job } from "@/types/jobs";

function money(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
  } catch {
    return `${amount.toLocaleString("tr-TR")} ${currency}`;
  }
}

export function formatJobCompensation(
  job: Pick<Job, "compensationType" | "compensationAmount" | "currency">,
): string {
  if (job.compensationType === "UNPAID") return "Unpaid";
  if (job.compensationType === "FIXED") {
    return job.compensationAmount !== null && job.currency
      ? money(job.compensationAmount, job.currency)
      : "Fixed compensation";
  }
  const detail =
    job.compensationAmount !== null && job.currency
      ? ` · ${money(job.compensationAmount, job.currency)}`
      : "";
  return `Negotiable${detail}`;
}
