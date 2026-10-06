"""
Alembic Environment Configuration for GridShield AI.

Handles:
- Dedicated schema (DB_SCHEMA, default 'gridshield') on PostgreSQL.
- Schemaless execution on SQLite.
"""

import os
from logging.config import fileConfig
from sqlalchemy import engine_from_config, pool, text
from alembic import context

from backend.app.persistence.models import Base
from backend.app.persistence.database import DATABASE_URL, DB_SCHEMA, IS_SQLITE

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata

def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    url = os.environ.get("DATABASE_URL_MIGRATIONS", DATABASE_URL)
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
        include_schemas=not IS_SQLITE,
        version_table_schema=DB_SCHEMA if not IS_SQLITE else None,
    )

    with context.begin_transaction():
        context.run_migrations()

def run_migrations_online() -> None:
    """Run migrations in 'online' mode."""
    mig_url = os.environ.get("DATABASE_URL_MIGRATIONS", DATABASE_URL)
    configuration = config.get_section(config.config_ini_section) or {}
    configuration["sqlalchemy.url"] = mig_url

    connectable = engine_from_config(
        configuration,
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        if not IS_SQLITE:
            connection.execute(text(f"CREATE SCHEMA IF NOT EXISTS {DB_SCHEMA};"))
            connection.commit()

        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            include_schemas=not IS_SQLITE,
            version_table_schema=DB_SCHEMA if not IS_SQLITE else None,
        )

        with context.begin_transaction():
            context.run_migrations()

if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
