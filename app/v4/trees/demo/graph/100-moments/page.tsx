import V4Moments100 from "@/app/components/v4/V4Moments100";
import V4Moments100ExactRangePlayback from "@/app/components/v4/V4Moments100ExactRangePlayback";
import "@/app/styles/v4/moments-100.css";
import "@/app/styles/v4/existing-fidelity-remediation.css";

export default function V4Moments100Page() {
  return (
    <>
      <V4Moments100 />
      <V4Moments100ExactRangePlayback />
    </>
  );
}
