import { Metadata } from "next";
import { DEFAULT_OG_IMAGE } from "@/lib/site";

export const metadata: Metadata = {
  title: "Quiz de Secourisme",
  description:
    "Testez et améliorez vos connaissances en secourisme avec nos quiz interactifs. Choisissez votre niveau de difficulté et entraînez-vous à votre rythme.",
  keywords:
    "quiz secourisme, formation premiers secours, test secourisme, quiz interactif, formation médicale",
  alternates: {
    canonical: "/quiz",
  },
  openGraph: {
    title: "Quiz de Secourisme | RescueLearn",
    description:
      "Testez et améliorez vos connaissances en secourisme avec nos quiz interactifs.",
    type: "website",
    url: "/quiz",
    siteName: "RescueLearn",
    locale: "fr_FR",
    images: [DEFAULT_OG_IMAGE],
  },
};
