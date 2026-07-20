# Permission taxonomy initialization

Permission names are deployed backend contracts. They are created by the reviewed `V002__init_data.sql` seed, while role-permission, platform-user-role, and tenant-membership-role assignments remain dynamic database data.

## Fresh database initialization

The current unreleased baseline intentionally contains only two Flyway migrations:

1. `V001__init_schema.sql` creates the final schema, foreign keys, indexes, PostgreSQL RLS policies, and runtime database grants.
2. `V002__init_data.sql` creates the canonical permission catalog, default platform and tenant roles, bootstrap administrator, and seed tenant data.

This baseline does not upgrade databases that have already recorded V003–V005. Drop and recreate the database before initialization, as explicitly required for this development baseline. After the first shared or production deployment, V001 and V002 become immutable and every later change must use a new forward-only Flyway version.

## Authorization validation boundary

Permission grammar and role/scope compatibility are application-domain rules:

- `PermissionScope.fromName` rejects non-canonical keys.
- `Permission` rejects a name/scope mismatch.
- `PlatformRole` accepts only `PLATFORM` permissions.
- `TenantRole` accepts only `TENANT` and `BUSINESS` permissions.
- Application services resolve the complete requested permission set before replacing a role's grants.

The permission workflow does not depend on database triggers. The schema keeps portable integrity primitives such as `NOT NULL`, `UNIQUE`, primary keys, and foreign keys. PostgreSQL RLS remains an infrastructure-specific, defense-in-depth tenant-isolation feature; it is not used to classify permissions.

## Portability note

`PermissionScope` is stored as `VARCHAR` and mapped with standard JPA enum-string mapping. The repository still uses PostgreSQL-specific RLS, native enums for several older domain fields, arrays, and JSONB. Supporting another database therefore requires a dialect-specific schema/RLS adapter, but the authorization domain and permission workflow do not require PostgreSQL triggers.
