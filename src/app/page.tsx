import type { Metadata } from "next";
import { MarketingHomepage } from "@/components/marketing/homepage";

export const metadata: Metadata = {
  title: "Innovink \u2014 Agentic AI Platform for Enterprise Innovation Programs",
  description:
    "Run hackathons, accelerators, open challenges, grants, and venture programs end to end with Innova \u2014 Innovink\u2019s AI agent. Governed by your team. Executed by the platform.",
  openGraph: {
    title: "Innovink \u2014 Agentic AI Platform for Enterprise Innovation Programs",
    description:
      "The enterprise operating system for innovation programs. AI drafts. Humans approve. Innovink executes.",
    siteName: "Innovink",
  },
};

export default function Home() {
  return <MarketingHomepage />;
}
