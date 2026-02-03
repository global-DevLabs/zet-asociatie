"use client"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { AnalyticsDataPoint, MetricType } from "@/lib/analytics-engine"

interface AnalyticsTableProps {
  data: AnalyticsDataPoint[]
  metric: MetricType
}

export function AnalyticsTable({ data, metric }: AnalyticsTableProps) {
  const metricKey = getMetricKey(metric)

  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Label</TableHead>
            <TableHead className="text-right">{metricKey}</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.map((row, index) => (
            <TableRow key={index}>
              <TableCell className="font-medium">{row.label}</TableCell>
              <TableCell className="text-right">{row[metricKey]}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}

function getMetricKey(metric: MetricType): string {
  const labels: Record<MetricType, string> = {
    member_count: "Membri",
    activity_count: "Activități",
    payment_count: "Plăți",
    total_amount: "Total (RON)",
    average_per_member: "Medie/Membru (RON)",
    participation_rate: "Participare (%)",
  }
  return labels[metric]
}
