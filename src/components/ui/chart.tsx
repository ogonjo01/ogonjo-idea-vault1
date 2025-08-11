/* src/components/charts/Chart.tsx */
import * as React from "react";
import * as Recharts from "recharts";
import { cn } from "@/lib/utils";

/** THEMES map — you already had this pattern */
const THEMES = { light: "", dark: ".dark" } as const;

export type ChartConfig = {
  [key: string]: {
    label?: React.ReactNode;
    icon?: React.ComponentType;
  } & (
    | { color?: string; theme?: never }
    | { color?: never; theme: Record<keyof typeof THEMES, string> }
  );
};

type ChartContextProps = {
  config: ChartConfig;
  chartId: string;
};

const ChartContext = React.createContext<ChartContextProps | null>(null);

export function useChart() {
  const ctx = React.useContext(ChartContext);
  if (!ctx) throw new Error("useChart must be used within <ChartContainer>");
  return ctx;
}

/** ChartContainer
 *  - `fullWidth` prop makes the wrapper use all available width
 *  - supplies CSS variables per-themed color using the existing theme map
 */
export const ChartContainer = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    config: ChartConfig;
    children: React.ComponentProps<typeof Recharts.ResponsiveContainer>["children"];
    fullWidth?: boolean;
    ariaLabel?: string;
  }
>(({ id, className, children, config, fullWidth = false, ariaLabel, ...props }, ref) => {
  const uniqueId = React.useId().replace(/:/g, "");
  const chartId = `chart-${id ?? uniqueId}`;

  return (
    <ChartContext.Provider value={{ config, chartId }}>
      <div
        ref={ref}
        data-chart={chartId}
        role="region"
        aria-label={ariaLabel ?? `Chart ${chartId}`}
        className={cn(
          // sizing & layout
          "relative flex aspect-[16/9] justify-center text-xs",
          fullWidth ? "w-full max-w-full px-0" : "w-full max-w-full",
          // base visual utilities + transitions
          "rounded-lg transition-shadow duration-300 ease-in-out",
          // small default elevation
          "shadow-sm hover:shadow-lg",
          className
        )}
        {...props}
      >
        <ChartStyle id={chartId} config={config} />
        <Recharts.ResponsiveContainer>
          {children}
        </Recharts.ResponsiveContainer>
      </div>
    </ChartContext.Provider>
  );
});
ChartContainer.displayName = "ChartContainer";

/** ChartStyle
 * Produces CSS variables for each config entry per theme:
 * --color-<key>
 */
export const ChartStyle: React.FC<{ id: string; config: ChartConfig }> = ({ id, config }) => {
  const colorEntries = Object.entries(config).filter(([_, c]) => c.theme || c.color);
  if (!colorEntries.length) return null;

  const cssText = Object.entries(THEMES)
    .map(([themeName, prefix]) => {
      const body = colorEntries
        .map(([k, cfg]) => {
          const color = cfg.theme?.[themeName as keyof typeof cfg.theme] ?? cfg.color;
          return color ? `  --chart-${k}: ${color};` : null;
        })
        .filter(Boolean)
        .join("\n");
      return `${prefix} [data-chart="${id}"] {\n${body}\n}`;
    })
    .join("\n");

  return <style dangerouslySetInnerHTML={{ __html: cssText }} />;
};

/** Tooltip content: polished layout, keyboard accessible */
export const ChartTooltipContent = React.forwardRef<HTMLDivElement, {
  active?: boolean;
  payload?: any[];
  label?: string | number;
  labelFormatter?: (label: any) => React.ReactNode;
  formatter?: (value: any, name?: string) => React.ReactNode;
  className?: string;
  hideLabel?: boolean;
}>(({ active, payload, label, labelFormatter, formatter, className, hideLabel }, ref) => {
  const ctx = useChart();
  if (!active || !payload?.length) return null;

  return (
    <div
      ref={ref}
      role="dialog"
      aria-live="polite"
      className={cn(
        "rounded-md border bg-white/95 p-2 shadow-2xl text-xs backdrop-blur-sm",
        "ring-1 ring-gray-200",
        className
      )}
    >
      {!hideLabel && (
        <div className="mb-1 font-medium text-slate-800">
          {labelFormatter ? labelFormatter(label) : label}
        </div>
      )}
      <div className="grid gap-1">
        {payload.map((p, i) => {
          const name = p.name ?? p.dataKey ?? `series-${i}`;
          const cfg = ctx.config[name] ?? (ctx.config[p.dataKey] as any);
          const color = p.payload?.fill ?? p.color ?? `var(--chart-${p.dataKey})`;
          return (
            <div key={i} className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2 w-2 shrink-0 rounded-sm"
                  style={{ backgroundColor: color }}
                  aria-hidden
                />
                <div className="text-muted-foreground text-[0.8rem]">
                  {cfg?.label ?? name}
                </div>
              </div>
              <div className="font-mono text-slate-900">
                {formatter ? formatter(p.value, name) : (typeof p.value === "number" ? p.value.toLocaleString() : p.value)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
});
ChartTooltipContent.displayName = "ChartTooltipContent";

/** Legend content: simple, clean, with hover micro-interaction.
 *  The legend does not mutate the chart DOM (safe). It emits CSS --color cues for styling if you want.
 */
export const ChartLegendContent = React.forwardRef<HTMLDivElement, {
  payload?: any[];
  className?: string;
  nameKey?: string;
  hideIcon?: boolean;
}>(({ payload = [], className, nameKey, hideIcon }, ref) => {
  const ctx = useChart();
  if (!payload?.length) return null;

  return (
    <div ref={ref} className={cn("flex flex-wrap gap-3 items-center", className)}>
      {payload.map((item, idx) => {
        const key = `${nameKey ?? item.dataKey ?? item.value ?? idx}`;
        const cfg = ctx.config[key] ?? ctx.config[item.dataKey] ?? null;
        const swatch = item.color ?? `var(--chart-${item.dataKey})`;
        return (
          <button
            key={idx}
            type="button"
            className="group flex items-center gap-2 rounded px-2 py-1 transition-colors duration-150 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            aria-label={cfg?.label ? `Toggle ${cfg.label}` : `Series ${key}`}
            // no toggle side-effects — safe. Visual hover highlight only.
          >
            {!hideIcon ? (
              cfg?.icon ? (
                <cfg.icon />
              ) : (
                <span
                  className="inline-block h-3 w-3 rounded-sm transition-transform duration-150 group-hover:scale-110"
                  style={{ backgroundColor: swatch }}
                  aria-hidden
                />
              )
            ) : null}
            <span className="text-xs text-muted-foreground">{cfg?.label ?? item.value ?? key}</span>
          </button>
        );
      })}
    </div>
  );
});
ChartLegendContent.displayName = "ChartLegendContent";

/** Small skeleton to show while chart data loads */
export const ChartSkeleton: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn("animate-pulse bg-gradient-to-r from-gray-100 to-gray-50 rounded-lg", className ?? "w-full h-full")} />
);

/** re-export Recharts primitives for convenience */
export const ChartTooltip = Recharts.Tooltip;
export const ChartLegend = Recharts.Legend;
export const ChartLine = Recharts.Line;
export const ChartArea = Recharts.Area;
export const ChartBar = Recharts.Bar;
export const ChartXAxis = Recharts.XAxis;
export const ChartYAxis = Recharts.YAxis;
export const ChartCartesianGrid = Recharts.CartesianGrid;
export const ChartResponsiveContainer = Recharts.ResponsiveContainer;
export const ChartComposed = Recharts.ComposedChart;
export const ChartPie = Recharts.PieChart;
export const ChartRadar = Recharts.RadarChart;

export default ChartContainer;
