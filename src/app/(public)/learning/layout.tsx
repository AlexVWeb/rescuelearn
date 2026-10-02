import { Metadata } from "next";
import { metadata as learningMetadata } from "./metadata";

export const metadata: Metadata = learningMetadata;

export default function LearningLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
