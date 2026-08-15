"""add ramo_contenidos (recursos, tareas, anuncios del ramo)

Revision ID: c4e8a29f6b13
Revises: 9b3f2d6a1c47
Create Date: 2026-08-13 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4e8a29f6b13'
down_revision: Union[str, Sequence[str], None] = '9b3f2d6a1c47'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'ramo_contenidos',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('ramo_id', sa.Integer(), sa.ForeignKey('ramos.id'), nullable=False),
        sa.Column('tipo', sa.String(length=20), nullable=False),
        sa.Column('titulo', sa.String(length=200), nullable=False),
        sa.Column('descripcion', sa.Text(), nullable=True),
        sa.Column('fecha_entrega', sa.Date(), nullable=True),
        sa.Column('publicado', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('creado_por', sa.Integer(), sa.ForeignKey('alumnos.id'), nullable=False),
        sa.Column('creado_en', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_ramo_contenidos_ramo_id', 'ramo_contenidos', ['ramo_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_ramo_contenidos_ramo_id', table_name='ramo_contenidos')
    op.drop_table('ramo_contenidos')
