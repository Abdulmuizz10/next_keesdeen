"use client";

import { useRouter } from "next/navigation";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  Treemap,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ComposedChart,
  Line,
  PieChart,
  Pie,
  Cell,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter,
  ZAxis,
  FunnelChart,
  Funnel,
  LabelList,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Users,
  Percent,
  Tag,
  TrendingUp,
  TrendingDown,
  Minus,
  Undo2,
  Star,
  PackageSearch,
  Layers,
  Mail,
} from "lucide-react";

interface ReportsData {
  summary: {
    totalRevenue: number;
    totalOrders: number;
    aov: number;
    totalDiscount: number;
    newCustomers: number;
    totalRefunded: number;
    refundRate: number;
    deltaRevenue: number;
    deltaOrders: number;
    deltaAov: number;
    deltaDiscount: number;
    deltaNewCustomers: number;
  };
  trend: {
    date: string;
    revenue: number;
    netRevenue: number;
    refunds: number;
    orders: number;
    aov: number;
    discount: number;
    newCustomers: number;
    avgRating: number;
    reviewCount: number;
  }[];
  byCategory: { name: string; revenue: number; units: number }[];
  byCoupon: {
    code: string;
    description: string;
    revenue: number;
    orders: number;
    discount: number;
  }[];
  cohort: { bucket: string; customers: number; revenue: number }[];
  refunds: {
    total: number;
    count: number;
    rate: number;
    byReason: { reason: string; amount: number; count: number }[];
  };
  reviews: {
    byCategory: { category: string; avgRating: number; count: number }[];
  };
  products: {
    performance: {
      title: string;
      revenue: number;
      units: number;
      sellThrough: number;
    }[];
    stagnant: { title: string; daysListed: number }[];
  };
  collections: { name: string; revenue: number; units: number }[];
  subscriberFunnel: { stage: string; value: number }[];
}

const ACCENT = "#04BB6E";
const DANGER = "#B3261E";

const COLORS = [
  "#04BB6E",
  "#3b82f6",
  "#f59e0b",
  "#6366f1",
  "#ef4444",
  "#0ea5e9",
  "#8b5cf6",
  "#ec4899",
];

const tipStyle: any = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 0,
  fontSize: 12,
};

const inputClass =
  "px-3 py-2 border border-[hsl(var(--border))] text-sm bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:border-[hsl(var(--foreground))]";

function DeltaBadge({ value }: { value: number }) {
  const isFlat = value === 0;
  const isUp = value > 0;
  const color = isFlat ? "#9C9C9C" : isUp ? ACCENT : DANGER;
  const Icon = isFlat ? Minus : isUp ? TrendingUp : TrendingDown;
  return (
    <span
      className="inline-flex items-center gap-1 text-xs font-semibold"
      style={{ color }}
    >
      <Icon size={12} />
      {isFlat ? "0%" : `${isUp ? "+" : ""}${value}%`}
    </span>
  );
}

function KpiCard({
  label,
  value,
  delta,
  icon: Icon,
  sparkData,
  sparkKey,
  sparkColor,
}: {
  label: string;
  value: string;
  delta?: number;
  icon: React.ElementType;
  sparkData: Record<string, any>[];
  sparkKey: string;
  sparkColor: string;
}) {
  return (
    <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-4 flex flex-col justify-between min-h-32">
      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))]">
            <Icon size={14} />
            <span className="text-[11px] font-semibold uppercase tracking-wider">
              {label}
            </span>
          </div>
          {delta !== undefined && <DeltaBadge value={delta} />}
        </div>
        <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
          {value}
        </p>
      </div>
      <div className="h-8 -mx-1 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={sparkData}
            margin={{ top: 2, right: 0, left: 0, bottom: 0 }}
          >
            <Area
              type="monotone"
              dataKey={sparkKey}
              stroke={sparkColor}
              fill={`${sparkColor}22`}
              strokeWidth={1.5}
              dot={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function BentoCell({
  title,
  subtitle,
  className = "",
  children,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 flex flex-col ${className}`}
    >
      <h2 className="text-sm font-semibold text-[hsl(var(--foreground))]">
        {title}
      </h2>
      {subtitle && (
        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5 mb-1">
          {subtitle}
        </p>
      )}
      <div className={subtitle ? "mt-2 flex-1" : "mt-4 flex-1"}>{children}</div>
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="text-sm text-[hsl(var(--muted-foreground))] py-16 text-center">
      {label}
    </p>
  );
}

// Flat, square treemap cells — no rounded corners, thin card-colored gaps
function TreemapCell(props: any) {
  const { x, y, width, height, index, name, value } = props;
  const fill = COLORS[index % COLORS.length];
  const showLabel = width > 55 && height > 30;
  return (
    <g>
      <rect
        x={x}
        y={y}
        width={width}
        height={height}
        style={{ fill, stroke: "hsl(var(--card))", strokeWidth: 2 }}
      />
      {showLabel && (
        <>
          <text x={x + 8} y={y + 18} fontSize={11} fontWeight={700} fill="#fff">
            {name}
          </text>
          <text x={x + 8} y={y + 32} fontSize={10} fill="#ffffffcc">
            ${Number(value).toLocaleString()}
          </text>
        </>
      )}
    </g>
  );
}

export function ReportsClient({
  initialData,
  fromDate,
  toDate,
}: {
  initialData: ReportsData;
  fromDate: string;
  toDate: string;
}) {
  const router = useRouter();

  const applyRange = (from: string, to: string) => {
    const params = new URLSearchParams();
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    router.push(`/admin/reports?${params.toString()}`);
  };

  const d = initialData;

  return (
    <div className="space-y-6">
      {/* Date range picker */}
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
            From
          </label>
          <input
            type="date"
            defaultValue={fromDate}
            id="from-date"
            className={inputClass}
          />
        </div>
        <div>
          <label className="block text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1.5">
            To
          </label>
          <input
            type="date"
            defaultValue={toDate}
            id="to-date"
            className={inputClass}
          />
        </div>
        <button
          onClick={() => {
            const f = (document.getElementById("from-date") as HTMLInputElement)
              .value;
            const t = (document.getElementById("to-date") as HTMLInputElement)
              .value;
            applyRange(f, t);
          }}
          className="px-4 py-2 bg-[hsl(var(--foreground))] text-[hsl(var(--background))] text-xs font-semibold uppercase tracking-wider hover:opacity-85 transition-opacity"
        >
          Apply
        </button>
        <div className="flex gap-2 ml-auto">
          {[
            { label: "7d", days: 7 },
            { label: "30d", days: 30 },
            { label: "90d", days: 90 },
          ].map(({ label, days }) => (
            <button
              key={label}
              onClick={() => {
                const t = new Date();
                const f = new Date(Date.now() - days * 86400000);
                applyRange(
                  f.toISOString().slice(0, 10),
                  t.toISOString().slice(0, 10),
                );
              }}
              className="px-3 py-2 border border-[hsl(var(--border))] text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))] transition-colors"
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI row — with sparklines + period-over-period deltas */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <KpiCard
          label="Revenue"
          value={`£${d.summary.totalRevenue.toLocaleString()}`}
          delta={d.summary.deltaRevenue}
          icon={DollarSign}
          sparkData={d.trend}
          sparkKey="revenue"
          sparkColor={ACCENT}
        />
        <KpiCard
          label="Orders"
          value={d.summary.totalOrders.toLocaleString()}
          delta={d.summary.deltaOrders}
          icon={ShoppingCart}
          sparkData={d.trend}
          sparkKey="orders"
          sparkColor="#3b82f6"
        />
        <KpiCard
          label="AOV"
          value={`$${d.summary.aov.toLocaleString()}`}
          delta={d.summary.deltaAov}
          icon={Percent}
          sparkData={d.trend}
          sparkKey="aov"
          sparkColor="#f59e0b"
        />
        <KpiCard
          label="Discounts Given"
          value={`$${d.summary.totalDiscount.toLocaleString()}`}
          delta={d.summary.deltaDiscount}
          icon={Tag}
          sparkData={d.trend}
          sparkKey="discount"
          sparkColor={DANGER}
        />
        <KpiCard
          label="New Customers"
          value={d.summary.newCustomers.toLocaleString()}
          delta={d.summary.deltaNewCustomers}
          icon={Users}
          sparkData={d.trend}
          sparkKey="newCustomers"
          sparkColor="#8b5cf6"
        />
        <KpiCard
          label="Refunded"
          value={`$${d.summary.totalRefunded.toLocaleString()}`}
          icon={Undo2}
          sparkData={d.trend}
          sparkKey="refunds"
          sparkColor={DANGER}
        />
      </div>

      {/* Bento grid — main analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Hero: Revenue / Orders / AOV trend */}
        <BentoCell
          title="Revenue, Orders & AOV Trend"
          className="lg:col-span-8"
        >
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart
              data={d.trend}
              margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(1, Math.floor(d.trend.length / 10))}
              />
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `£${v}`}
                width={55}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={35}
              />
              <Tooltip contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                yAxisId="left"
                type="monotone"
                dataKey="revenue"
                name="Revenue (£)"
                stroke={ACCENT}
                fill={`${ACCENT}22`}
                strokeWidth={2}
                dot={false}
              />
              <Bar
                yAxisId="right"
                dataKey="orders"
                name="Orders"
                fill="#3b82f6"
                opacity={0.6}
                radius={[0, 0, 0, 0]}
              />
              <Line
                yAxisId="left"
                type="monotone"
                dataKey="aov"
                name="AOV ($)"
                stroke="#f59e0b"
                strokeWidth={1.5}
                dot={false}
                strokeDasharray="4 2"
              />
            </ComposedChart>
          </ResponsiveContainer>
        </BentoCell>

        {/* Category treemap */}
        <BentoCell
          title="Revenue by Category"
          subtitle="Cell size = share of revenue"
          className="lg:col-span-4"
        >
          {d.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <Treemap
                data={d.byCategory.map((c) => ({
                  name: c.name,
                  size: c.revenue,
                }))}
                dataKey="size"
                stroke="hsl(var(--card))"
                content={<TreemapCell />}
              />
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No data" />
          )}
        </BentoCell>

        {/* Gross vs net revenue — refunds impact */}
        <BentoCell
          title="Gross vs. Net Revenue"
          subtitle={`${d.summary.refundRate}% of revenue refunded this period`}
          className="lg:col-span-7"
        >
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart
              data={d.trend}
              margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(1, Math.floor(d.trend.length / 10))}
              />
              <YAxis
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => `$${v}`}
                width={55}
              />
              <Tooltip contentStyle={tipStyle} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area
                type="monotone"
                dataKey="revenue"
                name="Gross Revenue ($)"
                stroke={ACCENT}
                fill={`${ACCENT}15`}
                strokeWidth={2}
                dot={false}
              />
              <Bar
                dataKey="refunds"
                name="Refunded ($)"
                fill={DANGER}
                opacity={0.7}
                radius={[0, 0, 0, 0]}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </BentoCell>

        {/* Refund reasons donut */}
        <BentoCell
          title="Refund Reasons"
          subtitle={`${d.refunds.count} refunds · $${d.refunds.total.toLocaleString()} total`}
          className="lg:col-span-5"
        >
          {d.refunds.byReason.length > 0 ? (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={180}>
                <PieChart>
                  <Pie
                    data={d.refunds.byReason}
                    dataKey="amount"
                    nameKey="reason"
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={70}
                    strokeWidth={0}
                  >
                    {d.refunds.byReason.map((entry, idx) => (
                      <Cell
                        key={entry.reason}
                        fill={COLORS[idx % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-1.5">
                {d.refunds.byReason.map((r, idx) => (
                  <div
                    key={r.reason}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] truncate">
                      <span
                        className="w-2 h-2 shrink-0"
                        style={{ background: COLORS[idx % COLORS.length] }}
                      />
                      <span className="truncate">{r.reason}</span>
                    </span>
                    <span className="font-medium text-[hsl(var(--foreground))] shrink-0 ml-2">
                      ${r.amount.toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <EmptyState label="No refunds in this period" />
          )}
        </BentoCell>

        {/* Review rating trend */}
        <BentoCell
          title="Rating Trend"
          subtitle="Average review score per day"
          className="lg:col-span-6"
        >
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart
              data={d.trend}
              margin={{ top: 5, right: 20, left: 0, bottom: 0 }}
            >
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                interval={Math.max(1, Math.floor(d.trend.length / 10))}
              />
              <YAxis
                domain={[0, 5]}
                tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                tickLine={false}
                axisLine={false}
                width={25}
              />
              <Tooltip contentStyle={tipStyle} />
              <Area
                type="monotone"
                dataKey="avgRating"
                name="Avg Rating"
                stroke="#f59e0b"
                fill="#f59e0b22"
                strokeWidth={2}
                dot={{ r: 2 }}
              />
            </AreaChart>
          </ResponsiveContainer>
        </BentoCell>

        {/* Rating by category radar */}
        <BentoCell
          title="Rating by Category"
          subtitle="All-time average"
          className="lg:col-span-6"
        >
          {d.reviews.byCategory.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <RadarChart data={d.reviews.byCategory}>
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                />
                <PolarRadiusAxis
                  domain={[0, 5]}
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                />
                <Radar
                  dataKey="avgRating"
                  stroke={ACCENT}
                  fill={ACCENT}
                  fillOpacity={0.35}
                />
                <Tooltip contentStyle={tipStyle} />
              </RadarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No reviews yet" />
          )}
        </BentoCell>

        {/* Product performance scatter */}
        <BentoCell
          title="Product Performance"
          subtitle="Revenue vs. units sold — bubble size = sell-through %"
          className="lg:col-span-8"
        >
          {d.products.performance.length > 0 ? (
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <XAxis
                  type="number"
                  dataKey="units"
                  name="Units"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="revenue"
                  name="Revenue"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={55}
                />
                <ZAxis
                  type="number"
                  dataKey="sellThrough"
                  range={[60, 400]}
                  name="Sell-through"
                />
                <Tooltip
                  cursor={{ strokeDasharray: "3 3" }}
                  contentStyle={tipStyle}
                  formatter={(value: any, name: any) =>
                    name === "Sell-through"
                      ? [`${value}%`, name]
                      : [value, name]
                  }
                />
                <Scatter data={d.products.performance} fill={ACCENT} />
              </ScatterChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No product sales in this period" />
          )}
        </BentoCell>

        {/* Stagnant inventory */}
        <BentoCell
          title="Stagnant Inventory"
          subtitle="Published, zero sales this period"
          className="lg:col-span-4"
        >
          {d.products.stagnant.length > 0 ? (
            <div className="space-y-1">
              {d.products.stagnant.map((p, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 border-b border-[hsl(var(--border))] last:border-b-0"
                >
                  <span className="text-xs text-[hsl(var(--foreground))] truncate">
                    {p.title}
                  </span>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] shrink-0 ml-2">
                    {p.daysListed}d listed
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
              <PackageSearch size={20} className="mb-2" />
              <p className="text-sm">Everything published has sold</p>
            </div>
          )}
        </BentoCell>

        {/* Collections revenue */}
        <BentoCell title="Revenue by Collection" className="lg:col-span-6">
          {d.collections.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={d.collections}
                layout="vertical"
                margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={110}
                  tickFormatter={(v: string) =>
                    v.length > 16 ? v.slice(0, 16) + "…" : v
                  }
                />
                <Tooltip
                  formatter={
                    ((v: any) => [`$${v.toLocaleString()}`, "Revenue"]) as (
                      value: any,
                    ) => [string, string]
                  }
                  contentStyle={tipStyle}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No collection data" />
          )}
        </BentoCell>

        {/* Subscriber funnel */}
        <BentoCell
          title="Subscriber → Customer Funnel"
          subtitle="Lifetime conversion, not date-filtered"
          className="lg:col-span-6"
        >
          <ResponsiveContainer width="100%" height={200}>
            <FunnelChart>
              <Tooltip contentStyle={tipStyle} />
              <Funnel
                dataKey="value"
                data={d.subscriberFunnel}
                isAnimationActive
              >
                <LabelList
                  position="right"
                  dataKey="stage"
                  fill="hsl(var(--foreground))"
                  fontSize={11}
                />
                <LabelList
                  position="left"
                  dataKey="value"
                  fill="hsl(var(--foreground))"
                  fontSize={11}
                  fontWeight={700}
                />
                {d.subscriberFunnel.map((entry, idx) => (
                  <Cell key={entry.stage} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Funnel>
            </FunnelChart>
          </ResponsiveContainer>
        </BentoCell>

        {/* Coupon efficiency */}
        <BentoCell
          title="Coupon Efficiency"
          subtitle="Revenue driven vs. discount cost, per code"
          className="lg:col-span-7"
        >
          {d.byCoupon.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={d.byCoupon}
                layout="vertical"
                margin={{ top: 5, right: 20, left: 10, bottom: 0 }}
              >
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                />
                <YAxis
                  type="category"
                  dataKey="code"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={70}
                />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="revenue"
                  name="Revenue ($)"
                  fill={ACCENT}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="discount"
                  name="Discount ($)"
                  fill={DANGER}
                  radius={[0, 0, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No coupon usage in this period" />
          )}
        </BentoCell>

        {/* Customer cohort */}
        <BentoCell
          title="Customer Repeat Purchase Snapshot"
          subtitle="Distribution of customers by order count (all time)"
          className="lg:col-span-5"
        >
          {d.cohort.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart
                data={d.cohort}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <XAxis
                  dataKey="bucket"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip contentStyle={tipStyle} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar
                  dataKey="customers"
                  name="Customers"
                  fill={ACCENT}
                  radius={[0, 0, 0, 0]}
                />
                <Bar
                  dataKey="revenue"
                  name="Revenue ($)"
                  fill="#3b82f6"
                  radius={[0, 0, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState label="No cohort data in this period" />
          )}
        </BentoCell>

        {/* Coupon detail table */}
        <BentoCell title="Coupon Usage Detail" className="lg:col-span-12">
          {d.byCoupon.length > 0 ? (
            <div className="overflow-y-auto max-h-[220px]">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-[hsl(var(--border))]">
                    <th className="text-left py-2 font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Code
                    </th>
                    <th className="text-right py-2 font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Orders
                    </th>
                    <th className="text-right py-2 font-semibold text-[hsl(var(--muted-foreground))] uppercase tracking-wider">
                      Revenue
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {d.byCoupon.map((c) => (
                    <tr
                      key={c.code}
                      className="border-b border-[hsl(var(--border))] last:border-b-0"
                    >
                      <td className="py-2">
                        <p className="font-mono font-medium text-[hsl(var(--foreground))]">
                          {c.code}
                        </p>
                        {c.description && (
                          <p className="text-[hsl(var(--muted-foreground))] truncate max-w-[110px]">
                            {c.description}
                          </p>
                        )}
                      </td>
                      <td className="py-2 text-right text-[hsl(var(--foreground))]">
                        {c.orders}
                      </td>
                      <td className="py-2 text-right text-[hsl(var(--foreground))]">
                        £{c.revenue.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState label="No coupon usage" />
          )}
        </BentoCell>
      </div>
    </div>
  );
}
