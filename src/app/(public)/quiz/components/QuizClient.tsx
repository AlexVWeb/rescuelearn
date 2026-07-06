"use client";

import dynamic from "next/dynamic";

const QuizCatalogue = dynamic(() => import("../page"), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-12 w-12 animate-spin rounded-full border-t-2 border-b-2 border-blue-600"></div>
    </div>
  ),
});

export default function QuizClient() {
  return <QuizCatalogue />;
}
