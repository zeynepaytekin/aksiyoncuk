import Avatar from "@/components/ui/Avatar";
import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";

export default function LeftSidebar() {
  return (
    <Card as="aside">
      <div className="flex flex-col items-center text-center">
        <Avatar size="lg" className="mb-4" />
        <h2 className="text-lg font-semibold text-gray-900">Zeynep Aytekin</h2>
        <p className="text-sm text-gray-500">Director / Actor / Creator</p>
        <p className="mt-3 text-sm text-gray-600">
          Film ve yaratıcı sektör profesyonelleri için bağlantılar, projeler ve fırsatlar.
        </p>
      </div>

      <div className="mt-6 space-y-3 border-t border-gray-100 pt-4 text-sm text-gray-700">
        <div className="flex justify-between">
          <span>Followers</span>
          <span className="font-semibold">1,284</span>
        </div>
        <div className="flex justify-between">
          <span>Mutuals</span>
          <span className="font-semibold">342</span>
        </div>
        <div className="flex justify-between">
          <span>Profile Views</span>
          <span className="font-semibold">8,920</span>
        </div>
      </div>

      <div className="mt-6 border-t border-gray-100 pt-4">
        <h3 className="mb-3 text-sm font-semibold text-gray-900">Profile Switch</h3>
        <div className="flex flex-col gap-2">
          <Button variant="unstyled" size="none" className="rounded-xl border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50">
            Networking Profile
          </Button>
          <Button variant="unstyled" size="none" className="rounded-xl border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50">
            Freelancer Profile
          </Button>
          <Button variant="unstyled" size="none" className="rounded-xl border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50">
            Teaching Profile
          </Button>
          <Button variant="unstyled" size="none" className="rounded-xl border border-gray-200 px-4 py-2 text-left text-sm hover:bg-gray-50">
            Distribution Profile
          </Button>
        </div>
      </div>
    </Card>
  );
}
