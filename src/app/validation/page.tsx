import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { RefreshCw } from "lucide-react";
import { ValidationContent } from "./components/validation-content";

export default function ValidationPage() {
  return (
    <div className="bg-muted/20 flex min-h-screen items-center justify-center p-4">
      <Suspense
        fallback={
          <Card className="flex w-full max-w-md items-center justify-center p-12">
            <RefreshCw className="text-primary h-8 w-8 animate-spin" />
          </Card>
        }
      >
        <ValidationContent />
      </Suspense>
    </div>
  );
}
