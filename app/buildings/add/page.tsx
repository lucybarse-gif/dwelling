import Link from "next/link";
import AddBuildingForm from "./AddBuildingForm";

export default async function AddBuildingPage({
  searchParams,
}: {
  searchParams: Promise<{ address?: string }>;
}) {
  const { address } = await searchParams;

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 py-12">
      <Link
        href="/buildings"
        className="text-sm text-stone-500 hover:text-stone-700 mb-6 inline-block"
      >
        ← Back to search
      </Link>

      <h1 className="text-2xl font-bold text-stone-900 mb-2">Add a building</h1>
      <p className="text-stone-500 text-sm mb-8">
        Can't find your building in our database? Add it below — once submitted
        you can write a review right away.
      </p>

      <div className="bg-white border border-stone-200 rounded-2xl p-6">
        <AddBuildingForm defaultAddress={address ?? ""} />
      </div>

      <div className="mt-6 bg-stone-50 border border-stone-200 rounded-xl p-4 text-xs text-stone-500 leading-relaxed">
        <strong className="text-stone-700">Note:</strong> Dwelling is primarily
        sourced from NYC's PLUTO dataset. If your building isn't listed, it may
        be classified as commercial or mixed-use. You're welcome to add it and
        fill in the details you know.
      </div>
    </div>
  );
}
