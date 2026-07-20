# Platform administrator recovery

Use this procedure only when no active user can administer global platform roles. It restores the seeded global `platform-admin` assignment and does not create a tenant membership or grant tenant business permissions.

1. Connect as the database owner through an audited maintenance session.
2. Identify and verify the intended enabled, unlocked user account.
3. Run the following transaction with the real user ID substituted for `:user_id`:

```sql
BEGIN;

SELECT id, name, enabled, locked
FROM user_account
WHERE id = :user_id
FOR UPDATE;

INSERT INTO platform_user_role (user_id, platform_role_id)
SELECT :user_id, id
FROM platform_role
WHERE name = 'platform-admin'
ON CONFLICT (user_id, platform_role_id) DO NOTHING;

SELECT assignment.user_id, role.name
FROM platform_user_role assignment
JOIN platform_role role ON role.id = assignment.platform_role_id
WHERE assignment.user_id = :user_id;

COMMIT;
```

4. Confirm the user can access a platform endpoint without `X-Tenant-Id`.
5. Confirm the user still cannot access tenant business data without an active membership.
6. Record the operator, reason, user ID, timestamp, and SQL result in the incident log.
