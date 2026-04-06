import {
  pgTable,
  uuid,
  timestamp,
  varchar,
  integer,
  text,
  boolean,
  decimal,
  date,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Enums ──────────────────────────────────────────────────────────

export const languageEnum = pgEnum("language", ["de", "tr", "en", "ru"]);
export const bundleEnum = pgEnum("bundle", [
  "safe_home",
  "safe_life",
  "safe_home_plus",
]);
export const customerStatusEnum = pgEnum("customer_status", [
  "active",
  "inactive",
  "suspended",
]);
export const operatorLanguageEnum = pgEnum("operator_language", [
  "de",
  "tr",
  "en",
]);
export const roleEnum = pgEnum("role", ["operator", "admin"]);
export const alertTypeEnum = pgEnum("alert_type", [
  "sos",
  "fall",
  "low_battery",
  "device_offline",
  "power_failure",
  "door_open",
  "smoke",
  "co",
  "test",
  "manual",
]);
export const alertSourceEnum = pgEnum("alert_source", [
  "hub",
  "mobile",
  "manual",
]);
export const caseStatusEnum = pgEnum("case_status", [
  "open",
  "in_progress",
  "resolved",
  "false_alarm",
]);
export const priorityEnum = pgEnum("priority", [
  "critical",
  "high",
  "medium",
  "low",
]);
export const deviceTypeEnum = pgEnum("device_type", ["hub", "mobile"]);
export const deviceStatusEnum = pgEnum("device_status", [
  "online",
  "offline",
  "low_battery",
]);

// ── Tables ─────────────────────────────────────────────────────────

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  firstName: varchar("first_name", { length: 100 }).notNull(),
  lastName: varchar("last_name", { length: 100 }).notNull(),
  birthYear: integer("birth_year"),
  phoneHome: varchar("phone_home", { length: 20 }),
  phoneMobile: varchar("phone_mobile", { length: 20 }).notNull(),
  address: text("address").notNull(),
  floor: varchar("floor", { length: 10 }),
  apartment: varchar("apartment", { length: 10 }),
  district: varchar("district", { length: 100 }),
  city: varchar("city", { length: 100 }).notNull().default("Antalya"),
  language: languageEnum("language").notNull().default("de"),
  bundle: bundleEnum("bundle").notNull(),
  status: customerStatusEnum("status").notNull().default("active"),
  medicalNotes: text("medical_notes"),
  deviceIdHub: varchar("device_id_hub", { length: 100 }),
  deviceIdMobile: varchar("device_id_mobile", { length: 100 }),
  monthlyFee: decimal("monthly_fee", { precision: 8, scale: 2 }),
  contractStart: date("contract_start"),
  notes: text("notes"),
});

export const emergencyContacts = pgTable("emergency_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  name: varchar("name", { length: 200 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  relationship: varchar("relationship", { length: 100 }),
  priority: integer("priority").notNull(),
  language: languageEnum("language").notNull().default("de"),
  notes: text("notes"),
});

export const operators = pgTable("operators", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  name: varchar("name", { length: 200 }).notNull(),
  email: varchar("email", { length: 200 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 500 }).notNull(),
  phoneExtension: varchar("phone_extension", { length: 10 }),
  language: operatorLanguageEnum("language").notNull().default("de"),
  role: roleEnum("role").notNull().default("operator"),
  active: boolean("active").notNull().default(true),
  lastLogin: timestamp("last_login", { withTimezone: true }),
});

export const cases = pgTable("cases", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  customerId: uuid("customer_id")
    .notNull()
    .references(() => customers.id),
  operatorId: uuid("operator_id").references(() => operators.id),
  alertType: alertTypeEnum("alert_type").notNull(),
  alertSource: alertSourceEnum("alert_source").notNull().default("hub"),
  gpsLat: decimal("gps_lat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gps_lng", { precision: 10, scale: 7 }),
  status: caseStatusEnum("status").notNull().default("open"),
  callSid: varchar("call_sid", { length: 200 }),
  priority: priorityEnum("priority").notNull().default("high"),
  notes: text("notes"),
  durationSeconds: integer("duration_seconds"),
  resolvedBy: uuid("resolved_by").references(() => operators.id),
  resolutionNote: text("resolution_note"),
});

export const deviceHeartbeats = pgTable("device_heartbeats", {
  id: uuid("id").primaryKey().defaultRandom(),
  receivedAt: timestamp("received_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  deviceId: varchar("device_id", { length: 100 }).notNull(),
  customerId: uuid("customer_id").references(() => customers.id),
  deviceType: deviceTypeEnum("device_type").notNull(),
  batteryLevel: integer("battery_level"),
  signalStrength: integer("signal_strength"),
  gpsLat: decimal("gps_lat", { precision: 10, scale: 7 }),
  gpsLng: decimal("gps_lng", { precision: 10, scale: 7 }),
  status: deviceStatusEnum("status").notNull(),
  rawPayload: jsonb("raw_payload"),
});

export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  operatorId: uuid("operator_id").references(() => operators.id),
  action: varchar("action", { length: 200 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: uuid("entity_id"),
  details: jsonb("details"),
  ipAddress: varchar("ip_address", { length: 50 }),
});

// ── Relations ──────────────────────────────────────────────────────

export const customersRelations = relations(customers, ({ many }) => ({
  emergencyContacts: many(emergencyContacts),
  cases: many(cases),
  deviceHeartbeats: many(deviceHeartbeats),
}));

export const emergencyContactsRelations = relations(
  emergencyContacts,
  ({ one }) => ({
    customer: one(customers, {
      fields: [emergencyContacts.customerId],
      references: [customers.id],
    }),
  })
);

export const operatorsRelations = relations(operators, ({ many }) => ({
  cases: many(cases),
  auditLogs: many(auditLog),
}));

export const casesRelations = relations(cases, ({ one }) => ({
  customer: one(customers, {
    fields: [cases.customerId],
    references: [customers.id],
  }),
  operator: one(operators, {
    fields: [cases.operatorId],
    references: [operators.id],
    relationName: "assignedOperator",
  }),
  resolver: one(operators, {
    fields: [cases.resolvedBy],
    references: [operators.id],
    relationName: "resolver",
  }),
}));

export const deviceHeartbeatsRelations = relations(
  deviceHeartbeats,
  ({ one }) => ({
    customer: one(customers, {
      fields: [deviceHeartbeats.customerId],
      references: [customers.id],
    }),
  })
);

export const auditLogRelations = relations(auditLog, ({ one }) => ({
  operator: one(operators, {
    fields: [auditLog.operatorId],
    references: [operators.id],
  }),
}));
