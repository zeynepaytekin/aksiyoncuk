export const formatMoney = (amount: number, currency = "TRY") =>
  new Intl.NumberFormat("tr-TR", { style: "currency", currency }).format(amount);
export const formatMarketplaceDate = (value: string | null) =>
  value ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";
