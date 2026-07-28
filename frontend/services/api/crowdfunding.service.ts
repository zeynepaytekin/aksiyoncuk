import { DEFAULT_CROWDFUNDING_CAMPAIGN } from "@/constants/crowdfunding";
import { STORAGE_KEYS } from "@/constants/storage";
import { readStorage } from "@/services/storage/clientStorage";
import type { CrowdfundingCampaign } from "@/types/crowdfunding";

export type CrowdfundingService = {
  getFeatured: () => Promise<CrowdfundingCampaign>;
};

export const crowdfundingService: CrowdfundingService = {
  async getFeatured() {
    return readStorage(
      STORAGE_KEYS.crowdfunding,
      DEFAULT_CROWDFUNDING_CAMPAIGN,
    );
  },
};
