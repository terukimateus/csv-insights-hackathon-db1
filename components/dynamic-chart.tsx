"use client";

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
} from "recharts";

interface ChartInsight {
  type: "bar_chart" | "pie_chart" | "line_chart";
  summary: string;
  data: Array<Record<string, string | number>>;
  chart_representation: {
    x_axis?: string;
    y_axis?: string;
    dataKey?: string;
    nameKey?: string;
  };
}

interface DynamicChartProps {
  insight: ChartInsight;
}

// Interleaved multi-hue palette to avoid grouped tones
const COLORS = [
  // Roxo, Rosa, Vermelho, Amarelo, Azul, Verde (interleaved)
  "#6f42c1", // purple
  "#e83e8c", // pink
  "#e74c3c", // red
  "#f1c40f", // yellow
  "#3498db", // blue
  "#2ecc71", // green
  "#8e44ad", // purple
  "#ff66aa", // pink
  "#dc3545", // red
  "#ffd166", // yellow
  "#1f77b4", // blue
  "#28a745", // green
  "#9b59b6", // purple
  "#d6336c", // pink
  "#c0392b", // red (deeper)
  "#f39c12", // yellow (deeper)
  "#4dabf7", // blue (light)
  "#27ae60", // green (deeper)
];

// Deterministic hash for stable, pseudo-random color mapping by category
const hashString = (str: string) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return h;
};

const colorFromKey = (key: unknown, index: number) => {
  if (typeof key === "string" && key.trim().length > 0) {
    const idx = Math.abs(hashString(key)) % COLORS.length;
    return COLORS[idx];
  }
  // Interleave by stride to spread hues when no key
  const stride = 5;
  return COLORS[(index * stride) % COLORS.length];
};

const CustomBar = ({ data, dataKey }: { data: any[]; dataKey: string }) => {
  return (
    <>
      {data.map((entry, index) => (
        <Bar
          key={`bar-${index}`}
          dataKey={dataKey}
          fill={COLORS[index % COLORS.length]}
          radius={[4, 4, 0, 0]}
        />
      ))}
    </>
  );
};

export function DynamicChart({ insight }: DynamicChartProps) {
  const { type, data, chart_representation } = insight;

  console.log("[v0] Chart data:", data);
  console.log("[v0] Chart representation:", chart_representation);

  // Small helpers to infer sensible defaults from data when keys are not explicitly provided
  const first = (data && data.length > 0 ? data[0] : {}) as Record<string, any>;

  const inferStringKey = (preferred?: string) => {
    const candidates = [
      preferred,
      "label",
      "name",
      "category",
      ...Object.keys(first),
    ];
    return (
      candidates.find(
        (k) => k && first[k] !== undefined && typeof first[k] !== "number"
      ) ||
      candidates.find((k) => k && first[k] !== undefined) ||
      Object.keys(first)[0]
    );
  };

  const inferNumberKey = (preferred?: string) => {
    const candidates = [preferred, "value", ...Object.keys(first)];
    return (
      candidates.find(
        (k) => k && first[k] !== undefined && typeof first[k] === "number"
      ) ||
      candidates.find((k) => k && first[k] !== undefined) ||
      Object.keys(first)[1]
    );
  };

  const inferPieKeys = () => {
    const nameKey = inferStringKey(chart_representation?.nameKey);
    const dataKey = inferNumberKey(chart_representation?.dataKey);
    return { nameKey, dataKey };
  };

  // Gracefully handle empty or invalid data
  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        <p>No data available</p>
      </div>
    );
  }

  switch (type) {
    case "bar_chart": {
      // Detect the correct keys to use for X and Y axes with robust inference
      const xKey = inferStringKey(chart_representation?.x_axis);
      const yKey = inferNumberKey(chart_representation?.y_axis);

      return (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xKey}
              className="text-xs fill-muted-foreground"
              label={
                chart_representation?.x_axis
                  ? {
                      value: chart_representation.x_axis,
                      position: "insideBottom",
                      offset: -5,
                    }
                  : undefined
              }
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              label={
                chart_representation?.y_axis
                  ? {
                      value: chart_representation.y_axis,
                      angle: -90,
                      position: "insideLeft",
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Bar dataKey={yKey} radius={[4, 4, 0, 0]}>
              {data.map((d, index) => (
                <Cell
                  key={`bar-cell-${index}`}
                  fill={colorFromKey((d as any)[xKey], index)}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      );
    }

    case "pie_chart": {
      const { nameKey, dataKey } = inferPieKeys();
      return (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={(d: any) =>
                `${d?.name ?? ""} ${(
                  ((d?.percent as number) || 0) * 100
                ).toFixed(0)}%`
              }
              outerRadius={80}
              fill="#8884d8"
              dataKey={dataKey}
              nameKey={nameKey}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={colorFromKey((entry as any)[nameKey], index)}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
          </PieChart>
        </ResponsiveContainer>
      );
    }

    case "line_chart": {
      const xKey = inferStringKey(chart_representation?.x_axis);
      const yKey = inferNumberKey(chart_representation?.y_axis);
      return (
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={data}
            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey={xKey}
              className="text-xs fill-muted-foreground"
              label={
                chart_representation?.x_axis
                  ? {
                      value: chart_representation.x_axis,
                      position: "insideBottom",
                      offset: -5,
                    }
                  : undefined
              }
            />
            <YAxis
              className="text-xs fill-muted-foreground"
              label={
                chart_representation?.y_axis
                  ? {
                      value: chart_representation.y_axis,
                      angle: -90,
                      position: "insideLeft",
                    }
                  : undefined
              }
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "6px",
                color: "hsl(var(--foreground))",
              }}
              labelStyle={{ color: "hsl(var(--foreground))" }}
              itemStyle={{ color: "hsl(var(--foreground))" }}
            />
            <Line
              type="monotone"
              dataKey={yKey}
              stroke={COLORS[0]}
              strokeWidth={3}
              dot={(props: any) => {
                const { cx, cy, index } = props;
                const cat = data[index ?? 0]?.[xKey as any];
                const fill = colorFromKey(cat, index ?? 0);
                return (
                  <circle cx={cx} cy={cy} r={4} fill={fill} strokeWidth={2} />
                );
              }}
              activeDot={(props: any) => {
                const { cx, cy, index } = props;
                const cat = data[index ?? 0]?.[xKey as any];
                const fill = colorFromKey(cat, index ?? 0);
                return <circle cx={cx} cy={cy} r={6} fill={fill} />;
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      );
    }

    default:
      return (
        <div className="flex items-center justify-center h-full text-muted-foreground">
          <p>Unsupported chart type: {type}</p>
        </div>
      );
  }
}
