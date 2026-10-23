import dayjs from "dayjs";
import { CreateTrainingSessionInput } from "../../types";
import { SessionFormValues } from "./session-form";

// Valeur du select quand aucun responsable n'est choisi (Radix refuse "")
export const NO_RESPONSABLE = "none";

export function formatSessionFormData(
  data: SessionFormValues
): CreateTrainingSessionInput {
  return {
    title: data.title,
    type: data.type,
    location: data.location,
    maxTrainees: data.maxTrainees,
    status: data.status,
    isFC: data.isFC,
    responsablePedagogiqueId:
      data.responsablePedagogiqueId &&
      data.responsablePedagogiqueId !== NO_RESPONSABLE
        ? data.responsablePedagogiqueId
        : null,
    startDate: data.startDate ? dayjs(data.startDate).hour(12).toDate() : null,
    endDate: data.endDate ? dayjs(data.endDate).hour(12).toDate() : null,
  };
}
