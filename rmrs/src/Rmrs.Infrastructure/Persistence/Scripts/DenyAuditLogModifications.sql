-- ============================================================
-- DENY UPDATE and DELETE on AuditLogs table for the application user.
-- This enforces immutability of audit records at the database level.
-- No user (including System_Administrator) can modify or delete
-- audit log entries through the application.
--
-- Implements Requirements 11.3:
-- "THE RMRS SHALL store audit logs in append-only storage that
--  prevents modification or deletion by any user including
--  System_Administrator."
--
-- Run this script after creating the AuditLogs table and the
-- RmrsAppUser database login/user.
-- ============================================================

-- Deny UPDATE on the AuditLogs table for the application database user
DENY UPDATE ON dbo.AuditLogs TO [RmrsAppUser];

-- Deny DELETE on the AuditLogs table for the application database user
DENY DELETE ON dbo.AuditLogs TO [RmrsAppUser];

-- Verify permissions (optional diagnostic query)
-- SELECT 
--     dp.name AS [User],
--     o.name AS [Table],
--     p.permission_name,
--     p.state_desc
-- FROM sys.database_permissions p
-- JOIN sys.objects o ON p.major_id = o.object_id
-- JOIN sys.database_principals dp ON p.grantee_principal_id = dp.principal_id
-- WHERE o.name = 'AuditLogs' AND dp.name = 'RmrsAppUser';
