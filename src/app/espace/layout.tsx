import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Mon espace de formation",
  robots: { index: false, follow: false },
};

export default function EspaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="bg-muted/20 min-h-screen">{children}</div>;
}
