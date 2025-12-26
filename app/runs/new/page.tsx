import { Suspense } from "react";
import { RefreshCw } from "lucide-react";
import NewRunForm from "./new-run-form";

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-64">
      <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

export default function NewRunPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <NewRunForm />
    </Suspense>
  );
}
