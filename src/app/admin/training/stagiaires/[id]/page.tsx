import { notFound } from "next/navigation";
import { getTraineeWithHistory } from "../../actions";
import { TraineeProfileSection } from "./components/trainee-profile-section";
import { TrainingHistorySection } from "./components/training-history-section";

interface Props {
  params: Promise<{ id: string }>;
}

export default async function TraineeDetailPage({ params }: Props) {
  const { id } = await params;
  const trainee = await getTraineeWithHistory(id);

  if (!trainee) notFound();

  return (
    <div className="flex h-full flex-col gap-0">
      {/* Section haute sticky */}
      <div className="bg-background sticky top-0 z-10 border-b">
        <TraineeProfileSection trainee={trainee} />
      </div>

      {/* Section basse scrollable */}
      <div className="flex-1 overflow-auto p-6">
        <TrainingHistorySection
          inscriptions={trainee.inscriptions}
          externalTrainings={trainee.externalTrainings}
          traineeId={trainee.id}
        />
      </div>
    </div>
  );
}
