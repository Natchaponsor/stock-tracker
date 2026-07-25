"use client";

import { LineChart } from "lucide-react";
import { Card, CardHeader, CardTitle, CardSubtitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";

export function PositionChart() {
  return (
    <Card>
      <CardHeader>
        <div>
          <CardTitle>Price &amp; trend</CardTitle>
          <CardSubtitle>Daily close with 50/200 EMA</CardSubtitle>
        </div>
      </CardHeader>
      <EmptyState
        icon={LineChart}
        title="Coming Soon!"
        description="Historical price charts and EMA signals are paused while we line up a data provider that supports daily history on a free tier."
      />
    </Card>
  );
}
