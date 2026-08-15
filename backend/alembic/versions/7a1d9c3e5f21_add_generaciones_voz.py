"""add generaciones_voz (trazabilidad de costo TTS por generación)

Revision ID: 7a1d9c3e5f21
Revises: 3f97748787d0
Create Date: 2026-08-12 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7a1d9c3e5f21'
down_revision: Union[str, Sequence[str], None] = '3f97748787d0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table(
        'generaciones_voz',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('entrega_id', sa.Integer(), sa.ForeignKey('entregas.id'), nullable=True),
        sa.Column('mensaje_entrega_id', sa.Integer(), sa.ForeignKey('mensajes_entrega.id'), nullable=True),
        sa.Column('agente', sa.String(length=20), nullable=False),
        sa.Column('modelo', sa.String(length=50), nullable=False),
        sa.Column('voz', sa.String(length=30), nullable=False),
        sa.Column('formato', sa.String(length=10), nullable=False, server_default='mp3'),
        sa.Column('instrucciones', sa.Text(), nullable=False),
        sa.Column('texto_enviado', sa.Text(), nullable=False),
        sa.Column('input_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('input_tokens_source', sa.String(length=20), nullable=False, server_default='tiktoken'),
        sa.Column('output_tokens', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('output_tokens_source', sa.String(length=20), nullable=False, server_default='estimated'),
        sa.Column('audio_duration_ms', sa.Integer(), nullable=True),
        sa.Column('audio_size_bytes', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('costo_estimado_usd', sa.Numeric(precision=12, scale=8), nullable=False, server_default='0'),
        sa.Column('creado_en', sa.DateTime(), nullable=True),
    )
    op.create_index('ix_generaciones_voz_entrega_id', 'generaciones_voz', ['entrega_id'])


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_index('ix_generaciones_voz_entrega_id', table_name='generaciones_voz')
    op.drop_table('generaciones_voz')
