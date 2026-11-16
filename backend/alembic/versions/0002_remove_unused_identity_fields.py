"""Remove the never-used users table and predictions.patient_reference column.

The application has no accounts and stores no identifying reference. The upgrade
refuses to run if either holds data, so nothing is ever silently discarded.
"""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    connection = op.get_bind()
    users = connection.execute(sa.text("SELECT count(*) FROM users")).scalar_one()
    references = connection.execute(
        sa.text("SELECT count(*) FROM predictions WHERE patient_reference IS NOT NULL")).scalar_one()
    if users or references:
        raise RuntimeError(
            f"Refusing to drop unused fields that contain data ({users} users, {references} references). "
            "Export or clear them first.")
    op.drop_index("ix_predictions_patient_reference", table_name="predictions")
    op.drop_column("predictions", "patient_reference")
    op.drop_table("users")


def downgrade():
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("name", sa.String(120), nullable=False),
        sa.Column("email", sa.String(254), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False,
                  server_default=sa.func.now()),
    )
    op.add_column("predictions", sa.Column("patient_reference", sa.String(100)))
    op.create_index("ix_predictions_patient_reference", "predictions", ["patient_reference"])
