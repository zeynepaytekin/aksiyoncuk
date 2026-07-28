"use client";

import { useEffect, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import { DEFAULT_CROWDFUNDING_CAMPAIGN } from "@/constants/crowdfunding";
import { crowdfundingService } from "@/services/api/crowdfunding.service";

export default function CrowdfundingSection() {
  const [campaign, setCampaign] = useState(DEFAULT_CROWDFUNDING_CAMPAIGN);

  useEffect(() => {
    let isActive = true;

    void crowdfundingService.getFeatured().then((featuredCampaign) => {
      if (isActive) setCampaign(featuredCampaign);
    });

    return () => {
      isActive = false;
    };
  }, []);

  return (
    <Card as="section">
      <h2 className="mb-4 text-lg font-bold">Crowdfunding</h2>

      <div className="rounded-xl border border-gray-200 p-4">
        <h3 className="font-semibold">{campaign.title}</h3>
        <p className="mt-2 text-sm leading-6 text-gray-600">
          {campaign.description}
        </p>

        <div className="mt-4 h-3 overflow-hidden rounded-full bg-gray-100">
          <div className="h-full w-2/3 rounded-full bg-black" />
        </div>

        <div className="mt-2 flex justify-between text-sm text-gray-500">
          <span>₺{campaign.raised.toLocaleString("en-US")} raised</span>
          <span>₺{campaign.goal.toLocaleString("en-US")} goal</span>
        </div>

        <Button
          shape="pill"
          size="none"
          className="mt-4 px-5 py-2 text-sm font-semibold"
        >
          Donate
        </Button>
      </div>
    </Card>
  );
}
