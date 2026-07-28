import type { CrowdfundingCampaign } from "@/types/crowdfunding";

export const DEFAULT_CROWDFUNDING_CAMPAIGN: CrowdfundingCampaign = {
  id: 1,
  title: "Independent Film Campaign",
  description:
    "Bağımsız film projesi için destek kampanyası. Destekçiler erken izleme, özel etkinlik ve teşekkür kredisi kazanabilir.",
  raised: 66_000,
  goal: 100_000,
};
