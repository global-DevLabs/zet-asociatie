"use client"

import { useState, useEffect, useRef } from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts"
import type { ChartType, MetricType, AnalyticsDataPoint } from "@/lib/analytics-engine"

interface AnalyticsChartProps {
  data: AnalyticsDataPoint[]
  chartType: ChartType
  metric: MetricType
}

const COLORS = ["#2563eb", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316"]

export function AnalyticsChart({ data, chartType, metric }: AnalyticsChartProps) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 400 })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return

    let rafId: number | null = null
    const resizeObserver = new ResizeObserver((entries) => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }

      rafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const { width } = entry.contentRect
          setDimensions({ width, height: 400 })
        }
      })
    })

    resizeObserver.observe(containerRef.current)

    return () => {
      if (rafId !== null) {
        cancelAnimationFrame(rafId)
      }
      resizeObserver.disconnect()
    }
  }, [])

  const metricKey = getMetricKey(metric)

  if (chartType === "bar") {
    return (
      <div ref={containerRef} className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="label" className="text-xs" stroke="hsl(var(--muted-foreground))" />
            <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey={metricKey} fill="#2563eb" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartType === "line") {
    return (
      <div ref={containerRef} className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted/30" />
            <XAxis dataKey="label" className="text-xs" stroke="hsl(var(--muted-foreground))" />
            <YAxis className="text-xs" stroke="hsl(var(--muted-foreground))" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Line
              type="monotone"
              dataKey={metricKey}
              stroke="#2563eb"
              strokeWidth={2}
              dot={{ fill: "#2563eb", r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (chartType === "pie") {
    return (
      <div ref={containerRef} className="h-[400px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={data} dataKey={metricKey} nameKey="label" cx="50%" cy="50%" outerRadius={120} label>
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                borderColor: "hsl(var(--border))",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )
  }

  return null
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
