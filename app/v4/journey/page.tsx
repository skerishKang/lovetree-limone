import V4FirstJourney from "@/app/components/v4/V4FirstJourney";
import V4FirstJourneyFidelityBridge from "@/app/components/v4/V4FirstJourneyFidelityBridge";
import "@/app/styles/v4/first-journey.css";
import "@/app/styles/v4/existing-fidelity-remediation.css";

export default function V4FirstJourneyPage() {
  return (
    <>
      <V4FirstJourney />
      <V4FirstJourneyFidelityBridge />
    </>
  );
}
