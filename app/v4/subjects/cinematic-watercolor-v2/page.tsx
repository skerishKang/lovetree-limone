import V4PersonAlbums from "@/app/components/v4/V4PersonAlbums";
import "@/app/styles/v4/archive.css";
import CinematicWatercolorSubjectLens from "./CinematicWatercolorSubjectLens";

export default function V4CinematicWatercolorSubjectPage() {
  return (
    <>
      <CinematicWatercolorSubjectLens />
      <div id="subject-library" data-current-subject-authority="/v4/subjects">
        <V4PersonAlbums />
      </div>
    </>
  );
}
