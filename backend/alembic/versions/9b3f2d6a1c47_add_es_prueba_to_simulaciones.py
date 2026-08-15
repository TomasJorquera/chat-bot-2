"""add es_prueba to simulaciones

Revision ID: 9b3f2d6a1c47
Revises: 7a1d9c3e5f21
Create Date: 2026-08-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '9b3f2d6a1c47'
down_revision: Union[str, Sequence[str], None] = '7a1d9c3e5f21'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.add_column('simulaciones', sa.Column('es_prueba', sa.Boolean(), nullable=False, server_default='false'))


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_column('simulaciones', 'es_prueba')
