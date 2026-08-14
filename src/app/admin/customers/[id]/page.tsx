import { notFound } from "next/navigation";
import Link from "next/link";
import dbConnect from "@/lib/db";
import { requireRouteAccess } from "@/lib/auth-helpers";
import { PageHeader } from "@/components/admin";
import { StatusBadge } from "@/components/admin/StatusBadge";
import User from "@/lib/models/User";
import Order from "@/lib/models/Order";
import Address from "@/lib/models/Address";
import Wishlist from "@/lib/models/Wishlist";
import Product from "@/lib/models/Product";
import { formatPrice } from "@/lib/format";
import { ArrowLeft, ShoppingBag, MapPin, Heart, Mail } from "lucide-react";

interface CustomerDetailProps {
  params: Promise<{ id: string }>;
}

export const dynamic = "force-dynamic";

const ACCENT = "#04BB6E";

function SectionLabel({
  icon: Icon,
  children,
}: {
  icon: React.ElementType;
  children: React.ReactNode;
}) {
  return (
    <h2 className="text-sm font-semibold text-[hsl(var(--foreground))] mb-4 flex items-center gap-2">
      <Icon size={15} className="text-[hsl(var(--muted-foreground))]" />
      {children}
    </h2>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[hsl(var(--border))] px-4 py-3">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-1">
        {label}
      </p>
      <p className="text-lg font-semibold text-[hsl(var(--foreground))]">
        {value}
      </p>
    </div>
  );
}

export default async function CustomerDetailPage({
  params,
}: CustomerDetailProps) {
  await requireRouteAccess("/admin/customers");
  const { id } = await params;
  await dbConnect();

  const customer = await User.findById(id).lean();
  if (!customer) notFound();

  const [orders, addresses, wishlist] = await Promise.all([
    Order.find({ userId: id }).sort({ createdAt: -1 }).limit(20).lean(),
    Address.find({ userId: id }).lean(),
    Wishlist.findOne({ userId: id }).lean(),
  ]);

  let wishlistProducts: { _id: string; title: string; slug: string }[] = [];
  if (wishlist && wishlist.productIds.length > 0) {
    const prods = await Product.find({ _id: { $in: wishlist.productIds } })
      .select("title slug")
      .lean();
    wishlistProducts = prods.map((p) => ({
      _id: p._id.toString(),
      title: p.title,
      slug: p.slug,
    }));
  }

  const totalSpend = orders.reduce(
    (s, o) => s + (o.paymentStatus === "paid" ? o.grandTotal : 0),
    0,
  );

  return (
    <>
      <Link
        href="/admin/customers"
        className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))] mb-4 transition-colors"
      >
        <ArrowLeft size={14} />
        Back to Customers
      </Link>

      <PageHeader
        title={customer.name}
        description={`${customer.email} · Joined ${new Date(
          customer.createdAt,
        ).toLocaleDateString("en-US", {
          year: "numeric",
          month: "long",
          day: "numeric",
        })}`}
      />

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
        <Stat label="Orders" value={String(orders.length)} />
        <Stat label="Lifetime Spend" value={formatPrice(totalSpend)} />
        <Stat label="Addresses" value={String(addresses.length)} />
        <Stat label="Wishlist" value={String(wishlistProducts.length)} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Orders */}
        <div className="lg:col-span-2 bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
          <SectionLabel icon={ShoppingBag}>
            Orders ({orders.length})
          </SectionLabel>
          <div>
            {orders.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                No orders yet
              </p>
            ) : (
              orders.map((o) => (
                <Link
                  key={o._id.toString()}
                  href={`/admin/orders/${o._id.toString()}`}
                  className="flex items-center justify-between py-3 border-b border-[hsl(var(--border))] last:border-b-0 hover:bg-[hsl(var(--accent))] transition-colors -mx-2 px-2"
                >
                  <div>
                    <p className="font-mono text-sm text-[hsl(var(--foreground))]">
                      {o.orderNumber}
                    </p>
                    <p className="text-xs text-[hsl(var(--muted-foreground))]">
                      {new Date(o.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge value={o.status} />
                    <span className="font-semibold text-[hsl(var(--foreground))] w-20 text-right">
                      {formatPrice(o.grandTotal)}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
            <SectionLabel icon={Mail}>Contact</SectionLabel>
            <p className="font-medium text-[hsl(var(--foreground))]">
              {customer.email}
            </p>
            {/* {customer.phone && (
              <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                {customer.phone}
              </p>
            )} */}
          </div>

          {/* Addresses */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
            <SectionLabel icon={MapPin}>
              Addresses ({addresses.length})
            </SectionLabel>
            {addresses.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                None saved
              </p>
            ) : (
              <div>
                {addresses.map((a) => (
                  <div
                    key={a._id.toString()}
                    className="py-3 border-b border-[hsl(var(--border))] last:border-b-0 first:pt-0"
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-[11px] font-semibold uppercase tracking-wider text-[hsl(var(--foreground))]">
                        {a.label}
                      </p>
                      {a.isDefault && (
                        <span
                          className="text-[10px] font-semibold uppercase tracking-wider"
                          style={{ color: ACCENT }}
                        >
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-[hsl(var(--muted-foreground))] leading-relaxed">
                      {a.fullName}
                      <br />
                      {a.line1}, {a.city}, {a.region} {a.postalCode}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Wishlist */}
          <div className="bg-[hsl(var(--card))] border border-[hsl(var(--border))] p-6">
            <SectionLabel icon={Heart}>
              Wishlist ({wishlistProducts.length})
            </SectionLabel>
            {wishlistProducts.length === 0 ? (
              <p className="text-sm text-[hsl(var(--muted-foreground))]">
                Empty
              </p>
            ) : (
              <div>
                {wishlistProducts.map((p) => (
                  <Link
                    key={p._id}
                    href={`/admin/products/${p._id}`}
                    className="block text-sm text-[hsl(var(--foreground))] py-2 border-b border-[hsl(var(--border))] last:border-b-0 hover:text-[hsl(var(--primary))] transition-colors"
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
