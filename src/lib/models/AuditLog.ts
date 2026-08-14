import mongoose, { Schema, Document, Model } from "mongoose";

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "login"
  | "logout"
  | "password_change"
  | "role_change"
  | "order_status_change"
  | "refund_processed"
  | "settings_change"
  | "bulk_action";

export interface IAuditLog extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  userEmail: string;
  userRole: string;
  action: AuditAction;
  resourceType: string; // e.g., "Product", "Order", "User"
  resourceId?: mongoose.Types.ObjectId;
  resourceIdentifier?: string; // e.g., order number, product slug
  description: string;
  changes?: {
    field: string;
    oldValue: unknown;
    newValue: unknown;
  }[];
  metadata?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

const AuditLogSchema = new Schema<IAuditLog>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userEmail: {
      type: String,
      required: true,
    },
    userRole: {
      type: String,
      required: true,
    },
    action: {
      type: String,
      enum: [
        "create",
        "update",
        "delete",
        "login",
        "logout",
        "password_change",
        "role_change",
        "order_status_change",
        "refund_processed",
        "settings_change",
        "bulk_action",
      ],
      required: true,
    },
    resourceType: {
      type: String,
      required: true,
    },
    resourceId: {
      type: Schema.Types.ObjectId,
    },
    resourceIdentifier: {
      type: String,
    },
    description: {
      type: String,
      required: true,
    },
    changes: [
      {
        field: { type: String },
        oldValue: { type: Schema.Types.Mixed },
        newValue: { type: Schema.Types.Mixed },
      },
    ],
    metadata: {
      type: Schema.Types.Mixed,
    },
    ipAddress: {
      type: String,
    },
    userAgent: {
      type: String,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

// Indexes
AuditLogSchema.index({ userId: 1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ resourceType: 1, resourceId: 1 });
AuditLogSchema.index({ createdAt: -1 });

// TTL index to auto-delete logs older than 2 years
AuditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 63072000 });

const AuditLog: Model<IAuditLog> =
  mongoose.models.AuditLog || mongoose.model<IAuditLog>("AuditLog", AuditLogSchema);

export default AuditLog;
