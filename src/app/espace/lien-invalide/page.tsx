import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LinkIcon, LogOut } from "lucide-react";

const MESSAGES: Record<string, { title: string; description: string }> = {
  revoque: {
    title: "Ce lien n'est plus valide",
    description:
      "Un nouveau lien vous a peut-être été envoyé : utilisez le message le plus récent de votre organisme de formation.",
  },
  "trop-de-tentatives": {
    title: "Trop de tentatives",
    description:
      "Patientez quelques minutes, puis rouvrez le lien reçu par email.",
  },
  deconnecte: {
    title: "Vous êtes déconnecté",
    description:
      "Pour revenir dans votre espace, rouvrez le lien reçu par email.",
  },
};

const DEFAULT_MESSAGE = {
  title: "Lien invalide",
  description:
    "Ce lien d'accès n'est pas reconnu. Vérifiez que vous avez ouvert le lien complet reçu par email, ou demandez-en un nouveau à votre organisme de formation.",
};

export default async function LienInvalidePage({
  searchParams,
}: {
  searchParams: Promise<{ raison?: string }>;
}) {
  const { raison } = await searchParams;
  const message = (raison && MESSAGES[raison]) || DEFAULT_MESSAGE;
  const Icon = raison === "deconnecte" ? LogOut : LinkIcon;

  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center space-y-3">
          <Icon
            className="text-muted-foreground mx-auto h-10 w-10"
            aria-hidden="true"
          />
          <CardTitle className="text-xl">
            <h1>{message.title}</h1>
          </CardTitle>
          <CardDescription>{message.description}</CardDescription>
        </CardHeader>
        <CardContent />
      </Card>
    </main>
  );
}
