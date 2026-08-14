"use client";

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  AlertTriangle,
  Tag,
  Mail,
  Star,
  Truck,
  CreditCard,
  Globe,
  Clock,
  UserCheck,
} from "lucide-react";

interface DashData {
  kpi: {
    totalRevenue: number;
    totalOrders: number;
    productCount: number;
    customerCount: number;
    customerChange: number;
    aov: number;
    revenueChange: number;
    ordersChange: number;
    aovChange: number;
  };
  revenueChart: { date: string; revenue: number; orders: number }[];
  orderStatusChart: { status: string; count: number }[];
  topProducts: { title: string; revenue: number; units: number }[];
  lowStock: {
    productTitle: string;
    sku: string;
    stock: number;
    threshold: number;
  }[];
  categoryPerformance: { category: string; revenue: number; units: number }[];
  hourlyActivity: { hour: string; orders: number }[];
  geography: {
    topCountries: { location: string; orders: number; revenue: number }[];
    topCities: { location: string; orders: number; revenue: number }[];
  };
  payments: {
    paid: number;
    pending: number;
    failed: number;
    avgTransactionValue: number;
  };
  shipping: {
    avgShippingCost: number;
    freeShippingOrders: number;
    paidShippingOrders: number;
  };
  coupons: {
    totalCoupons: number;
    activeCoupons: number;
    totalUses: number;
    totalDiscountGiven: number;
    mostUsed: { code: string; uses: number } | null;
  };
  subscribers: { total: number; newThisMonth: number; growthChange: number };
  reviews: {
    total: number;
    averageRating: number;
    thisMonth: number;
    ratingDistribution: { rating: number; count: number }[];
  };
  customers: {
    newCustomers: number;
    returningCustomers: number;
    retentionRate: number;
    avgLifetimeValue: number;
  };
  auth: { google: number; password: number; admins: number };
}

interface Props {
  data: DashData | null;
  userName: string;
}

const STATUS_COLORS: Record<string, string> = {
  pending: "#DA5B14",
  confirmed: "#E8A87C",
  processing: "#9C9C9C",
  shipped: "#7CC9A5",
  delivered: "#04BB6E",
  cancelled: "#B3261E",
  refunded: "#3C3C3C",
};
const CHART_COLORS = [
  "#04BB6E",
  "#DA5B14",
  "#9C9C9C",
  "#7CC9A5",
  "#B3261E",
  "#3C3C3C",
];

function fmt(cents: number) {
  if (cents >= 100000)
    return `$${(cents / 100).toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, ",")}`;
  return `$${(cents / 100).toFixed(0)}`;
}

function fmtDollars(v: number) {
  return `$${v.toLocaleString()}`;
}

function Trend({ value }: { value: number }) {
  const positive = value >= 0;
  return (
    <span
      className={`text-xs font-medium ${positive ? "text-[#04BB6E]" : "text-red-600"}`}
    >
      {positive ? "+" : ""}
      {value.toFixed(1)}%
    </span>
  );
}

function Panel({
  title,
  icon: Icon,
  children,
  className = "",
}: {
  title: string;
  icon?: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5 ${className}`}
    >
      <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
        {Icon && (
          <Icon size={15} className="text-[hsl(var(--muted-foreground))]" />
        )}
        {title}
      </h2>
      {children}
    </div>
  );
}

function StatLine({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-[hsl(var(--border))] last:border-b-0">
      <span className="text-xs text-[hsl(var(--muted-foreground))]">
        {label}
      </span>
      <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
        {value}
      </span>
    </div>
  );
}

function Bar1D({
  label,
  value,
  max,
  color,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
}) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-[hsl(var(--foreground))]">{label}</span>
        <span className="text-[hsl(var(--muted-foreground))]">
          {fmt(value)}
        </span>
      </div>
      <div className="h-1.5 bg-[hsl(var(--muted))]">
        <div
          className="h-full"
          style={{ width: `${(value / max) * 100}%`, backgroundColor: color }}
        />
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "hsl(var(--card))",
  border: "1px solid hsl(var(--border))",
  borderRadius: 0,
  fontSize: 12,
};

export function BentoDashboard({ data, userName }: Props) {
  const k = data?.kpi;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
          Dashboard
        </h1>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
          Welcome back, {userName}
        </p>
      </div>

      {/* KPI strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Revenue",
            value: k ? fmt(k.totalRevenue) : "—",
            icon: DollarSign,
            change: k?.revenueChange,
            sub: `AOV ${k ? fmt(k.aov) : "—"}`,
          },
          {
            label: "Total Orders",
            value: k ? k.totalOrders.toLocaleString() : "—",
            icon: ShoppingCart,
            change: k?.ordersChange,
            sub: "Last 30 days",
          },
          {
            label: "Products",
            value: k ? k.productCount.toLocaleString() : "—",
            icon: Package,
            sub: "Published",
          },
          {
            label: "Customers",
            value: k ? k.customerCount.toLocaleString() : "—",
            icon: Users,
            change: k?.customerChange,
            sub: "Registered",
          },
        ].map(({ label, value, icon: Icon, sub, change }) => (
          <div
            key={label}
            className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-5"
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[hsl(var(--muted-foreground))]">
                {label}
              </span>
              <div className="w-9 h-9 bg-[hsl(var(--accent))] flex items-center justify-center text-[hsl(var(--muted-foreground))]">
                <Icon size={20} />
              </div>
            </div>
            <p className="text-2xl font-bold text-[hsl(var(--foreground))]">
              {value}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-xs text-[hsl(var(--muted-foreground))]">
                {sub}
              </p>
              {change !== undefined && <Trend value={change} />}
            </div>
          </div>
        ))}
      </div>

      {/* Row 1 — Revenue + Order status */}
      <div className="grid grid-cols-4 gap-4">
        <Panel
          title="Revenue — Last 30 Days"
          className="col-span-4 lg:col-span-3"
        >
          {data ? (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart
                data={data.revenueChart}
                margin={{ top: 5, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#04BB6E" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#04BB6E" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  interval={4}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <Tooltip
                  formatter={
                    ((v: any) => [fmtDollars(v), "Revenue"]) as (
                      value: any,
                    ) => [string, string]
                  }
                  contentStyle={tooltipStyle}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#04BB6E"
                  strokeWidth={2}
                  fill="url(#revGrad)"
                  dot={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[220px] flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No data available
            </div>
          )}
        </Panel>

        <Panel title="Order Status" className="col-span-4 lg:col-span-1">
          {data && data.orderStatusChart.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={140}>
                <PieChart>
                  <Pie
                    data={data.orderStatusChart}
                    dataKey="count"
                    nameKey="status"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={60}
                    strokeWidth={0}
                  >
                    {data.orderStatusChart.map((entry, idx) => (
                      <Cell
                        key={entry.status}
                        fill={
                          STATUS_COLORS[entry.status] ||
                          CHART_COLORS[idx % CHART_COLORS.length]
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-2 space-y-1">
                {data.orderStatusChart.map((s) => (
                  <div
                    key={s.status}
                    className="flex items-center justify-between text-xs"
                  >
                    <span className="flex items-center gap-1.5 text-[hsl(var(--muted-foreground))] capitalize">
                      <span
                        className="w-2 h-2 shrink-0"
                        style={{
                          background: STATUS_COLORS[s.status] || "#888",
                        }}
                      />
                      {s.status}
                    </span>
                    <span className="font-medium text-[hsl(var(--foreground))]">
                      {s.count}
                    </span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div className="h-[180px] flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No orders
            </div>
          )}
        </Panel>
      </div>

      {/* Row 2 — Top products, category performance, low stock */}
      <div className="grid grid-cols-4 gap-4">
        <Panel
          title="Top Products by Revenue"
          className="col-span-4 lg:col-span-2"
        >
          {data && data.topProducts.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data.topProducts}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
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
                  dataKey="title"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  width={100}
                  tickFormatter={(v: string) =>
                    v.length > 16 ? v.slice(0, 16) + "…" : v
                  }
                />
                <Tooltip
                  formatter={
                    ((v: any) => [fmtDollars(v), "Revenue"]) as (
                      value: any,
                    ) => [string, string]
                  }
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="revenue" fill="#04BB6E" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No sales data
            </div>
          )}
        </Panel>

        <Panel title="Revenue by Category" className="col-span-4 lg:col-span-2">
          {data && data.categoryPerformance.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart
                data={data.categoryPerformance}
                margin={{ top: 0, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid vertical={false} stroke="hsl(var(--border))" />
                <XAxis
                  dataKey="category"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => `$${v}`}
                  width={50}
                />
                <Tooltip
                  formatter={
                    ((v: any) => [fmtDollars(v), "Revenue"]) as (
                      value: any,
                    ) => [string, string]
                  }
                  contentStyle={tooltipStyle}
                />
                <Bar dataKey="revenue" fill="#DA5B14" radius={0} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[200px] flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No category data
            </div>
          )}
        </Panel>

        <Panel
          title="Low Stock Alerts"
          icon={AlertTriangle}
          className="col-span-4"
        >
          {data && data.lowStock.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
              {data.lowStock.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between py-1.5 border-b border-[hsl(var(--border))] last:border-b-0"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-[hsl(var(--foreground))] truncate">
                      {item.productTitle}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                      {item.sku}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0 ml-3">
                    <span className="text-xs font-semibold text-[#DA5B14]">
                      {item.stock} left
                    </span>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">
                      /{item.threshold}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 flex flex-col items-center justify-center text-[hsl(var(--muted-foreground))]">
              <span className="text-2xl mb-2">✓</span>
              <p className="text-sm">All stock levels are healthy</p>
            </div>
          )}
        </Panel>
      </div>

      {/* Row 3 — Customers, reviews, subscribers */}
      <div className="grid grid-cols-3 gap-4">
        <Panel title="Customers" icon={UserCheck}>
          {data ? (
            <>
              <StatLine
                label="New customers"
                value={data.customers.newCustomers}
              />
              <StatLine
                label="Returning customers"
                value={data.customers.returningCustomers}
              />
              <StatLine
                label="Retention rate"
                value={`${data.customers.retentionRate.toFixed(1)}%`}
              />
              <StatLine
                label="Avg lifetime value"
                value={fmt(data.customers.avgLifetimeValue)}
              />
              <StatLine label="Google sign-ups" value={data.auth.google} />
              <StatLine label="Password sign-ups" value={data.auth.password} />
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No data
            </div>
          )}
        </Panel>

        <Panel title="Reviews" icon={Star}>
          {data ? (
            <>
              <StatLine label="Total reviews" value={data.reviews.total} />
              <StatLine
                label="Average rating"
                value={`${data.reviews.averageRating.toFixed(1)} / 5.0`}
              />
              <StatLine label="This month" value={data.reviews.thisMonth} />
              {data.reviews.ratingDistribution.length > 0 && (
                <div className="pt-3 space-y-1.5">
                  {data.reviews.ratingDistribution.map((r) => {
                    const max = Math.max(
                      ...data.reviews.ratingDistribution.map((x) => x.count),
                      1,
                    );
                    return (
                      <div key={r.rating} className="flex items-center gap-2">
                        <span className="text-xs text-[hsl(var(--muted-foreground))] w-6">
                          {r.rating}★
                        </span>
                        <div className="flex-1 h-1.5 bg-[hsl(var(--muted))]">
                          <div
                            className="h-full bg-[#04BB6E]"
                            style={{ width: `${(r.count / max) * 100}%` }}
                          />
                        </div>
                        <span className="text-xs text-[hsl(var(--muted-foreground))] w-6 text-right">
                          {r.count}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No data
            </div>
          )}
        </Panel>

        <Panel title="Email List" icon={Mail}>
          {data ? (
            <>
              <StatLine
                label="Total subscribers"
                value={data.subscribers.total.toLocaleString()}
              />
              <StatLine
                label="New this month"
                value={data.subscribers.newThisMonth}
              />
              <div className="pt-3 flex items-center gap-2">
                <Trend value={data.subscribers.growthChange} />
                <span className="text-xs text-[hsl(var(--muted-foreground))]">
                  vs previous 30 days
                </span>
              </div>
            </>
          ) : (
            <div className="h-40 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No data
            </div>
          )}
        </Panel>
      </div>

      {/* Row 4 — Geography + hourly activity */}
      <div className="grid grid-cols-3 gap-4">
        <Panel title="Top Countries" icon={Globe}>
          {data && data.geography.topCountries.length > 0 ? (
            <div className="space-y-2.5">
              {data.geography.topCountries.map((c) => (
                <Bar1D
                  key={c.location}
                  label={c.location}
                  value={c.revenue}
                  max={Math.max(
                    ...data.geography.topCountries.map((x) => x.revenue),
                    1,
                  )}
                  color="#04BB6E"
                />
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No geography data
            </div>
          )}
        </Panel>

        <Panel title="Top Cities" icon={Globe}>
          {data && data.geography.topCities.length > 0 ? (
            <div className="space-y-2.5">
              {data.geography.topCities.map((c) => (
                <Bar1D
                  key={c.location}
                  label={c.location}
                  value={c.revenue}
                  max={Math.max(
                    ...data.geography.topCities.map((x) => x.revenue),
                    1,
                  )}
                  color="#DA5B14"
                />
              ))}
            </div>
          ) : (
            <div className="h-40 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No geography data
            </div>
          )}
        </Panel>

        <Panel title="Orders by Hour" icon={Clock}>
          {data ? (
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={data.hourlyActivity}>
                <XAxis
                  dataKey="hour"
                  tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis hide />
                <Tooltip contentStyle={tooltipStyle} />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#04BB6E"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#04BB6E" }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No data
            </div>
          )}
        </Panel>
      </div>

      {/* Row 5 — Payments, shipping, coupons */}
      <div className="grid grid-cols-3 gap-4">
        <Panel title="Payments" icon={CreditCard}>
          {data ? (
            <>
              <StatLine label="Paid" value={data.payments.paid} />
              <StatLine label="Pending" value={data.payments.pending} />
              <StatLine label="Failed" value={data.payments.failed} />
              <StatLine
                label="Avg transaction"
                value={fmt(data.payments.avgTransactionValue)}
              />
            </>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No data
            </div>
          )}
        </Panel>

        <Panel title="Shipping" icon={Truck}>
          {data ? (
            <>
              <StatLine
                label="Avg shipping cost"
                value={fmt(data.shipping.avgShippingCost)}
              />
              <StatLine
                label="Free shipping orders"
                value={data.shipping.freeShippingOrders}
              />
              <StatLine
                label="Paid shipping orders"
                value={data.shipping.paidShippingOrders}
              />
            </>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No data
            </div>
          )}
        </Panel>

        <Panel title="Coupons" icon={Tag}>
          {data ? (
            <>
              <StatLine
                label="Active / total"
                value={`${data.coupons.activeCoupons}/${data.coupons.totalCoupons}`}
              />
              <StatLine label="Total uses" value={data.coupons.totalUses} />
              <StatLine
                label="Discount given"
                value={fmt(data.coupons.totalDiscountGiven)}
              />
              {data.coupons.mostUsed && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-[hsl(var(--muted-foreground))]">
                    Most used
                  </span>
                  <span className="text-xs font-mono text-[hsl(var(--foreground))]">
                    {data.coupons.mostUsed.code} · {data.coupons.mostUsed.uses}
                  </span>
                </div>
              )}
            </>
          ) : (
            <div className="h-[140px] flex items-center justify-center text-[hsl(var(--muted-foreground))] text-sm">
              No data
            </div>
          )}
        </Panel>
      </div>
    </div>
  );
}
