import dayjs from "dayjs";
import { CreateTrainingSessionInput } from "../../types";
import { SessionFormValues } from "./session-form";

export function formatSessionFormData(
  data: SessionFormValues
): CreateTrainingSessionInput {
  return {
    title: data.title,
    type: data.type,
    location: data.location,
    maxTrainees: data.maxTrainees,
    status: data.status,
    startDate: data.startDate ? dayjs(data.startDate).hour(12).toDate() : null,
    endDate: data.endDate ? dayjs(data.endDate).hour(12).toDate() : null,
  };
}
