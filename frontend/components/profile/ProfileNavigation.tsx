import Button from "@/components/ui/Button";

const profileSections = ["Works", "Jobs Posted", "Feed", "Crowdfunding"];

export default function ProfileNavigation() {
  return (
    <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
      {profileSections.map((item) => (
        <Button
          key={item}
          variant="unstyled"
          size="none"
          className="rounded-2xl border border-gray-200 bg-white p-5 text-sm font-semibold shadow-sm hover:bg-gray-50"
        >
          {item}
        </Button>
      ))}
    </div>
  );
}
