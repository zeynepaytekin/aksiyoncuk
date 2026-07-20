export default function RightSidebar() {
  return (
    <aside className="space-y-4">
      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-gray-900">Trending</h3>
        <ul className="space-y-3 text-sm text-gray-700">
          <li>#IndependentFilm</li>
          <li>#CastingCall</li>
          <li>#FilmFunding</li>
          <li>#CreativeCollaboration</li>
          <li>#FestivalSeason</li>
        </ul>
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm">
        <h3 className="mb-3 text-base font-semibold text-gray-900">Suggested People</h3>
        <div className="space-y-4">
          <div>
            <p className="font-medium text-gray-900">Noah Bennett</p>
            <p className="text-sm text-gray-500">Editor</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Olivia Reed</p>
            <p className="text-sm text-gray-500">Producer</p>
          </div>
          <div>
            <p className="font-medium text-gray-900">Daniel Foster</p>
            <p className="text-sm text-gray-500">Cinematographer</p>
          </div>
        </div>
      </div>
    </aside>
  );
}