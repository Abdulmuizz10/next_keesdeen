import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/admin";
import User from "@/lib/models/User";
import Order from "@/lib/models/Order";
import { formatPrice } from "@/lib/format";
import Link from "next/link";
import { Users, ExternalLink } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function CustomersPage() {
  await requireRouteAccess("/admin/customers");
  await dbConnect();

  const customers = await User.find({ role: "customer" })
    .sort({ createdAt: -1 })
    .limit(200)
    .lean();

  // Get order stats per customer
  const customerIds = customers.map((c) => c._id);

  const orderStats = await Order.aggregate([
    {
      $match: {
        userId: { $in: customerIds },
        paymentStatus: "paid",
      },
    },
    {
      $group: {
        _id: "$userId",
        totalSpend: { $sum: "$grandTotal" },
        orderCount: { $sum: 1 },
        lastOrder: { $max: "$createdAt" },
      },
    },
  ]);

  const statsMap = new Map(
    orderStats.map(
      (s: {
        _id: unknown;
        totalSpend: number;
        orderCount: number;
        lastOrder: Date;
      }) => [
        String(s._id),
        {
          totalSpend: s.totalSpend,
          orderCount: s.orderCount,
          lastOrder: s.lastOrder,
        },
      ],
    ),
  );

  const serialized = customers.map((c) => {
    const stats = statsMap.get(c._id.toString());

    return {
      _id: c._id.toString(),
      name: c.name,
      email: c.email,
      totalSpend: stats?.totalSpend || 0,
      orderCount: stats?.orderCount || 0,
      lastOrder: stats?.lastOrder ? stats.lastOrder.toISOString() : null,
      createdAt: c.createdAt.toISOString(),
    };
  });

  return (
    <>
      <PageHeader
        title="Customers"
        description={`${serialized.length} registered ${
          serialized.length === 1 ? "customer" : "customers"
        }`}
      />

      {/* Customer summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[hsl(var(--muted-foreground))]">
                Total Customers
              </p>

              <p className="text-2xl font-semibold text-[hsl(var(--foreground))] mt-1">
                {serialized.length}
              </p>
            </div>

            <div className="w-9 h-9 flex items-center justify-center bg-[hsl(var(--muted))]">
              <Users
                size={17}
                className="text-[hsl(var(--muted-foreground))]"
              />
            </div>
          </div>
        </div>

        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[hsl(var(--muted-foreground))]">
                With Orders
              </p>

              <p className="text-2xl font-semibold text-[hsl(var(--foreground))] mt-1">
                {
                  serialized.filter((customer) => customer.orderCount > 0)
                    .length
                }
              </p>
            </div>

            <div className="w-9 h-9 flex items-center justify-center bg-[hsl(var(--muted))]">
              <span className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                #
              </span>
            </div>
          </div>
        </div>

        <div className="border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-semibold text-[hsl(var(--muted-foreground))]">
                Total Customer Spend
              </p>

              <p className="text-2xl font-semibold text-[hsl(var(--foreground))] mt-1">
                {formatPrice(
                  serialized.reduce(
                    (sum, customer) => sum + customer.totalSpend,
                    0,
                  ),
                )}
              </p>
            </div>

            <div className="w-9 h-9 flex items-center justify-center bg-[hsl(var(--muted))]">
              <span className="text-sm font-semibold text-[hsl(var(--muted-foreground))]">
                ₦
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Customers table */}
      <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[hsl(var(--muted))] border-b border-[hsl(var(--border))]">
                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Customer
                </th>

                <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Orders
                </th>

                <th className="text-right px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Total Spend
                </th>

                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Last Order
                </th>

                <th className="text-left px-4 py-3 font-semibold text-[hsl(var(--muted-foreground))] uppercase text-xs tracking-wider">
                  Joined
                </th>

                <th className="w-12 px-4 py-3" />
              </tr>
            </thead>

            <tbody>
              {serialized.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <Users
                      size={28}
                      className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]"
                      strokeWidth={1.5}
                    />

                    <p className="text-sm font-medium text-[hsl(var(--foreground))]">
                      No customers yet
                    </p>

                    <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                      Registered customers will appear here.
                    </p>
                  </td>
                </tr>
              ) : (
                serialized.map((c) => (
                  <tr
                    key={c._id}
                    className="border-b border-[hsl(var(--border))] bg-[hsl(var(--background))] hover:bg-[hsl(var(--accent))] transition-colors"
                  >
                    {/* Customer */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c._id}`}
                        className="group block"
                      >
                        <p className="font-medium text-[hsl(var(--foreground))] group-hover:text-[hsl(var(--primary))]">
                          {c.name}
                        </p>

                        <p className="text-xs text-[hsl(var(--muted-foreground))] mt-0.5">
                          {c.email}
                        </p>
                      </Link>
                    </td>

                    {/* Orders */}
                    <td className="px-4 py-3 text-right text-[hsl(var(--foreground))]">
                      {c.orderCount}
                    </td>

                    {/* Total spend */}
                    <td className="px-4 py-3 text-right font-medium text-[hsl(var(--foreground))]">
                      {formatPrice(c.totalSpend)}
                    </td>

                    {/* Last order */}
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {c.lastOrder
                        ? new Date(c.lastOrder).toLocaleDateString()
                        : "—"}
                    </td>

                    {/* Joined */}
                    <td className="px-4 py-3 text-[hsl(var(--muted-foreground))] whitespace-nowrap">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>

                    {/* Action */}
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${c._id}`}
                        className="inline-flex items-center justify-center p-1.5 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--accent))] hover:text-[hsl(var(--foreground))]"
                        title="View customer"
                      >
                        <ExternalLink size={15} />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
