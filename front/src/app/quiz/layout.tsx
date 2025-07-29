import { Analytics } from "@vercel/analytics/react";

export default function QuizLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-gray-50">
      {children}
      <Analytics />
    </div>
  );
} 