import { JourneyExplorer } from "@/components/journey-explorer";
import { journeys as sampleJourneys } from "@/lib/journeys";
import { loadScanJourneys } from "@/lib/scan-loader";

export default async function Page() {
  const scan = await loadScanJourneys();
  return <JourneyExplorer journeys={scan?.journeys ?? sampleJourneys} meta={scan?.meta ?? null} />;
}
