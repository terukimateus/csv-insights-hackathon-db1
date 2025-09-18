"use client"

import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
} from "recharts"

interface ChartInsight {
  type: "bar_chart" | "pie_chart" | "line_chart"
  summary: string
  data: Array<Record<string, string | number>>
  chart_representation: {
    x_axis?: string
    y_axis?: string
    dataKey?: string
    nameKey?: string
  }
}

interface DynamicChartProps {
  insight: ChartInsight
}

const COLORS = [
  "#217346", // Primary green
  "#2e8b57", // Sea green
  "#3cb371", // Medium sea green
  "#20b2aa", // Light sea green
  "#008b8b", // Dark cyan
  "#4682b4", // Steel blue
  "#5f9ea0", // Cadet blue
  "#6495ed", // Cornflower blue
]

const CustomBar = ({ data, dataKey }: { data: any[]; dataKey: string }) => {
  return (
    <>
      {data.map((entry, index) => (
        <Bar key={`bar-${index}`} dataKey={dataKey} fill={COLORS[index % COLORS.length]} radius={[4, 4, 0, 0]} />
      ))}
    </>
  )
}

export function DynamicChart({ insight }: DynamicChartProps) {
  const { type, data, chart_representation } = insight

  console.log("[v0] Chart data:", data)
  console.log("[v0] Chart representation:", chart_representation)

  switch (type) {
    case "bar_chart":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={chart_representation.x_axis} className="text-xs fill-muted-foreground" />
            <YAxis className="text-xs fill-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            {data.map((entry, index) => (
              <Bar
                key={`bar-${index}`}
                dataKey={chart_representation.y_axis}
                fill={COLORS[index % COLORS.length]}
                radius={[4, 4, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )

    case "pie_chart":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
              outerRadius={80}
              fill="#8884d8"
              dataKey={chart_representation.dataKey}
              nameKey={chart_representation.nameKey}
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      )

    case "line_chart":
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis dataKey={chart_representation.x_axis} className="text-xs fill-muted-foreground" />
            <YAxis className="text-xs fill-muted-foreground" />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
              }}
            />
            <Line
              type="monotone"
              dataKey={chart_representation.y_axis}
              stroke={COLORS[0]}
              strokeWidth={3}
              dot={{ fill: COLORS[0], strokeWidth: 2, r: 4 }}
              activeDot={{ r: 6, fill: COLORS[0] }}
            />
          </LineChart>
        </ResponsiveContainer>
      )

    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Unsupported chart type: {type}</p>
        </div>
      )
  }
}
