import { Mail, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatPhone } from "../../../lib/format";
import type { ContactView } from "../types";

/** En bas de page, quelle que soit la phase : qui joindre en cas de question */
export function ContactCard({ contact }: { contact: ContactView }) {
  const { organisme, formateurs } = contact;

  return (
    <section aria-labelledby="contact-title" className="space-y-3">
      <h2 id="contact-title" className="text-lg font-semibold">
        Une question ?
      </h2>
      <div className="bg-card space-y-3 rounded-xl border p-4 text-sm">
        {formateurs.length > 0 && (
          <div>
            <p className="text-muted-foreground">
              {formateurs.length > 1 ? "Formateurs" : "Formateur"}
            </p>
            <p className="text-base font-medium">{formateurs.join(", ")}</p>
          </div>
        )}
        <div>
          <p className="text-muted-foreground">Organisme</p>
          <p className="font-medium">{organisme.name}</p>
        </div>
        {(organisme.phone || organisme.email) && (
          <div className="flex flex-wrap gap-2">
            {organisme.phone && (
              <Button asChild variant="outline" className="h-11">
                <a href={`tel:${organisme.phone.replace(/[^\d+]/g, "")}`}>
                  <Phone className="h-4 w-4" aria-hidden="true" />
                  {formatPhone(organisme.phone)}
                </a>
              </Button>
            )}
            {organisme.email && (
              <Button
                asChild
                variant="outline"
                className="h-auto min-h-11 max-w-full whitespace-normal"
              >
                <a href={`mailto:${organisme.email}`} className="break-all">
                  <Mail className="h-4 w-4 shrink-0" aria-hidden="true" />
                  {organisme.email}
                </a>
              </Button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
