import { Metadata } from "next";
import { ChangelogClient } from "./components/ChangelogClient";

export const metadata: Metadata = {
  title: "Mises à jour & Roadmap | RescueLearn",
  description:
    "Découvrez les dernières améliorations de RescueLearn et les fonctionnalités à venir sur notre plateforme d'apprentissage du secourisme.",
};

export default function ChangelogPage() {
  return <ChangelogClient />;
}
