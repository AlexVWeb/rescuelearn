"use client";

import { Bar, BarChart } from "recharts";
import { ChartContainer } from "@/components/ui/chart";

export function SessionChart({
  data,
}: {
  data: { name: string; total: number }[];
}) {
  return (
    <ChartContainer config={{}} className="aspect-auto h-full w-full">
      <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
        <Bar
          dataKey="total"
          fill="rgba(255, 255, 255, 0.8)"
          radius={[4, 4, 0, 0]}
          barSize={12}
        />
      </BarChart>
    </ChartContainer>
  );
}

import { RadialBarChart, RadialBar, PolarAngleAxis } from "recharts";

export function PresenceChart({ percentage }: { percentage: number }) {
  return (
    <ChartContainer
      config={{
        presence: {
          label: "Présence",
          color: "#0066CC",
        },
      }}
      className="aspect-auto h-full w-full"
    >
      <RadialBarChart
        innerRadius="70%"
        outerRadius="100%"
        data={[{ value: percentage, fill: "#0066CC" }]}
        startAngle={90}
        endAngle={90 + (360 * percentage) / 100}
        margin={{ top: 0, right: 0, left: 0, bottom: 0 }}
      >
        <PolarAngleAxis
          type="number"
          domain={[0, 100]}
          angleAxisId={0}
          tick={false}
        />
        <RadialBar
          background
          dataKey="value"
          cornerRadius={10}
          fill="#0066CC"
        />
      </RadialBarChart>
    </ChartContainer>
  );
}
