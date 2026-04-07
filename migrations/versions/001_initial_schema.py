"""Initial schema with RLS

Revision ID: 001
Revises:
Create Date: 2026-04-04
"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import UUID, ENUM

revision = "001"
down_revision = None
branch_labels = None
depends_on = None

RLS_TABLES = [
    "tables", "time_slots", "calendar_rules",
    "guests", "bookings", "waitlist",
]

# PostgreSQL ENUM references — create_type=False means "type already exists, don't create"
locationtype   = ENUM("indoor","outdoor","bar","private",         name="locationtype",   create_type=False)
channel        = ENUM("phone","web","whatsapp","line","messenger","walk_in", name="channel", create_type=False)
bookingstatus  = ENUM("confirmed","cancelled","no_show","completed",name="bookingstatus", create_type=False)
ruletype       = ENUM("blackout","special_hours",                  name="ruletype",       create_type=False)
waitliststatus = ENUM("waiting","notified","booked","expired",     name="waitliststatus", create_type=False)
notifchannel   = ENUM("sms","email","whatsapp","line","messenger",  name="notifchannel",  create_type=False)
notiftype      = ENUM("confirmation","reminder","cancellation","waitlist", name="notiftype", create_type=False)
notifstatus    = ENUM("sent","failed","pending",                   name="notifstatus",    create_type=False)


def upgrade() -> None:
    # Create enum types first
    op.execute("CREATE TYPE locationtype   AS ENUM ('indoor','outdoor','bar','private')")
    op.execute("CREATE TYPE channel        AS ENUM ('phone','web','whatsapp','line','messenger')")
    op.execute("CREATE TYPE bookingstatus  AS ENUM ('confirmed','cancelled','no_show','completed')")
    op.execute("CREATE TYPE ruletype       AS ENUM ('blackout','special_hours')")
    op.execute("CREATE TYPE waitliststatus AS ENUM ('waiting','notified','booked','expired')")
    op.execute("CREATE TYPE notifchannel   AS ENUM ('sms','email','whatsapp','line','messenger')")
    op.execute("CREATE TYPE notiftype      AS ENUM ('confirmation','reminder','cancellation','waitlist')")
    op.execute("CREATE TYPE notifstatus    AS ENUM ('sent','failed','pending')")

    op.create_table(
        "restaurants",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("owner_id", UUID(as_uuid=True), nullable=False),
        sa.Column("timezone", sa.String, nullable=False, server_default="UTC"),
        sa.Column("booking_horizon_days", sa.Integer, nullable=False, server_default="30"),
        sa.Column("cancellation_cutoff_hours", sa.Integer, nullable=False, server_default="2"),
        sa.Column("default_slot_duration_min", sa.Integer, nullable=False, server_default="90"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "tables",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("restaurant_id", UUID(as_uuid=True), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("label", sa.String, nullable=False),
        sa.Column("capacity", sa.Integer, nullable=False),
        sa.Column("location_type", locationtype, nullable=False, server_default="indoor"),
        sa.Column("floor_plan_x", sa.Float, nullable=True),
        sa.Column("floor_plan_y", sa.Float, nullable=True),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )

    op.create_table(
        "time_slots",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("restaurant_id", UUID(as_uuid=True), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("day_of_week", sa.Integer, nullable=False),
        sa.Column("start_time", sa.Time, nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=False),
        sa.Column("is_active", sa.Boolean, nullable=False, server_default="true"),
    )

    op.create_table(
        "calendar_rules",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("restaurant_id", UUID(as_uuid=True), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("date", sa.Date, nullable=False),
        sa.Column("rule_type", ruletype, nullable=False),
        sa.Column("open_time", sa.Time, nullable=True),
        sa.Column("close_time", sa.Time, nullable=True),
        sa.Column("note", sa.String, nullable=True),
    )

    op.create_table(
        "guests",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("restaurant_id", UUID(as_uuid=True), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("phone", sa.String, nullable=False),
        sa.Column("email", sa.String, nullable=True),
        sa.Column("preferred_channel", channel, nullable=False, server_default="phone"),
        sa.Column("visit_count", sa.Integer, nullable=False, server_default="0"),
        sa.Column("notes", sa.String, nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("restaurant_id", "phone", name="uq_guest_restaurant_phone"),
    )

    op.create_table(
        "bookings",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("restaurant_id", UUID(as_uuid=True), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("guest_id", UUID(as_uuid=True), sa.ForeignKey("guests.id"), nullable=False),
        sa.Column("table_id", UUID(as_uuid=True), sa.ForeignKey("tables.id"), nullable=False),
        sa.Column("slot_date", sa.Date, nullable=False),
        sa.Column("slot_start_time", sa.Time, nullable=False),
        sa.Column("duration_minutes", sa.Integer, nullable=False),
        sa.Column("party_size", sa.Integer, nullable=False),
        sa.Column("status", bookingstatus, nullable=False, server_default="confirmed"),
        sa.Column("special_requests", sa.String, nullable=True),
        sa.Column("booked_via", channel, nullable=False),
        sa.Column("confirmation_code", sa.String, nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "waitlist",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("restaurant_id", UUID(as_uuid=True), sa.ForeignKey("restaurants.id"), nullable=False),
        sa.Column("guest_id", UUID(as_uuid=True), sa.ForeignKey("guests.id"), nullable=False),
        sa.Column("table_id", UUID(as_uuid=True), sa.ForeignKey("tables.id"), nullable=False),
        sa.Column("slot_date", sa.Date, nullable=False),
        sa.Column("slot_start_time", sa.Time, nullable=False),
        sa.Column("party_size", sa.Integer, nullable=False),
        sa.Column("status", waitliststatus, nullable=False, server_default="waiting"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "notifications_log",
        sa.Column("id", UUID(as_uuid=True), primary_key=True),
        sa.Column("booking_id", UUID(as_uuid=True), sa.ForeignKey("bookings.id"), nullable=True),
        sa.Column("waitlist_id", UUID(as_uuid=True), sa.ForeignKey("waitlist.id"), nullable=True),
        sa.Column("channel", notifchannel, nullable=False),
        sa.Column("type", notiftype, nullable=False),
        sa.Column("status", notifstatus, nullable=False, server_default="pending"),
        sa.Column("sent_at", sa.DateTime(timezone=True), nullable=True),
    )

    # Enable RLS on all tenant tables
    for table in RLS_TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")
        op.execute(f"ALTER TABLE {table} FORCE ROW LEVEL SECURITY")
        op.execute(
            f"CREATE POLICY tenant_isolation ON {table} "
            f"USING (restaurant_id = current_setting('app.restaurant_id', true)::uuid)"
        )

    # Superuser bypass (for migrations and admin)
    op.execute("DO $$ BEGIN CREATE ROLE booking_app LOGIN PASSWORD 'changeme'; EXCEPTION WHEN duplicate_object THEN NULL; END $$")
    for table in RLS_TABLES:
        op.execute(f"GRANT ALL ON {table} TO booking_app")
    op.execute("GRANT ALL ON restaurants TO booking_app")


def downgrade() -> None:
    for table in RLS_TABLES:
        op.execute(f"DROP POLICY IF EXISTS tenant_isolation ON {table}")
    op.drop_table("notifications_log")
    op.drop_table("waitlist")
    op.drop_table("bookings")
    op.drop_table("guests")
    op.drop_table("calendar_rules")
    op.drop_table("time_slots")
    op.drop_table("tables")
    op.drop_table("restaurants")
    for t in ["locationtype","channel","bookingstatus","ruletype","waitliststatus","notifchannel","notiftype","notifstatus"]:
        op.execute(f"DROP TYPE IF EXISTS {t}")
