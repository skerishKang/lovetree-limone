import V4FirstJourney from "@/app/components/v4/V4FirstJourney";
import V4FirstJourneyV12 from "@/app/components/v4/V4FirstJourneyV12";
import V4FirstJourneyFidelityBridge from "@/app/components/v4/V4FirstJourneyFidelityBridge";
import "@/app/styles/v4/first-journey.css";
import "@/app/styles/v4/first-journey-v12.css";
import "@/app/styles/v4/existing-fidelity-remediation.css";

const STORAGE_KEY = "lovetree-first-journey-unified";

type JourneyPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function V4FirstJourneyPage({ searchParams }: JourneyPageProps) {
  const params = await searchParams;
  const legacy = Array.isArray(params.legacy) ? params.legacy[0] : params.legacy;

  if (legacy === "1") {
    return (
      <>
        <V4FirstJourney />
        <V4FirstJourneyFidelityBridge />
      </>
    );
  }

  return <V4FirstJourneyV12 storageKey={STORAGE_KEY} />;
}
