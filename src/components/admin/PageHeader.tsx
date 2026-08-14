import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  description?: string;
  /** A slot for the primary action button (top-right). */
  action?: ReactNode;
  /** Optional extra content below title row. */
  children?: ReactNode;
}

/**
 * Shared admin page header.
 * Every admin subpage from Phase 8 onward should use this component for
 * consistent title, description, and primary-action layout.
 *
 * Usage:
 * ```tsx
 * <PageHeader
 *   title="Products"
 *   description="Manage your product catalog"
 *   action={<Link href="/admin/products/new" className="...">Add Product</Link>}
 * />
 * ```
 */
export function PageHeader({ title, description, action, children }: PageHeaderProps) {
  return (
    <div className="mb-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-[hsl(var(--foreground))]">
            {title}
          </h1>
          {description && (
            <p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">
              {description}
            </p>
          )}
        </div>

        {action && <div className="flex-shrink-0">{action}</div>}
      </div>

      {children && <div className="mt-4">{children}</div>}
    </div>
  );
}
