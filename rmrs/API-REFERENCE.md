# RMRS API Reference

**Base URL:** `https://records.sdinmotion.co.za/api/v1`

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/auth/login` | Redirects to Bitrix OAuth |
| GET | `/auth/bitrix/callback` | OAuth callback handler |
| POST | `/auth/refresh` | Refresh access token |
| POST | `/auth/logout` | Invalidate session |
| GET | `/auth/me` | Get current user profile |

---

## Department Mapping

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/departments` | List all department mappings |
| GET | `/departments/{id}` | Get single mapping |
| POST | `/departments` | Create mapping |
| PUT | `/departments/{id}` | Update mapping |
| DELETE | `/departments/{id}` | Delete mapping |
| POST | `/departments/{id}/validate` | Validate Bitrix workgroup |

---

## File Plan

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/file-plan/tree` | Get full tree structure |
| GET | `/file-plan/entries/{id}` | Get single entry |
| GET | `/file-plan/entries/{id}/children` | Get children |
| POST | `/file-plan/entries` | Create entry |
| PUT | `/file-plan/entries/{id}` | Update entry |
| POST | `/file-plan/entries/{id}/deactivate` | Deactivate entry |
| GET | `/file-plan/retention-rules` | List retention rules |
| POST | `/file-plan/retention-rules` | Create retention rule |

---

## Records Registry

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/records` | List records (filtered) |
| GET | `/records/{id}` | Get record detail |
| POST | `/records/incoming` | Register incoming record |
| POST | `/records/outgoing` | Register outgoing record |
| POST | `/records/internal` | Register internal record |
| PUT | `/records/{id}` | Update record metadata |
| GET | `/records/{id}/history` | Get record audit history |

---

## Documents

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/records/{recordId}/documents` | Upload document |
| GET | `/records/{recordId}/documents` | List documents for record |
| GET | `/documents/{id}` | Get document metadata |
| GET | `/documents/{id}/download` | Download document |
| POST | `/documents/{id}/versions` | Upload new version |
| GET | `/documents/{id}/versions` | List versions |
| POST | `/documents/{id}/verify` | Verify checksum integrity |

---

## Physical Records

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/physical-records/{id}` | Get physical record info |
| GET | `/physical-records/{id}/location` | Get current location |
| POST | `/physical-records/{id}/move` | Move to new location |
| POST | `/physical-records/bulk-move` | Bulk move by scan |
| GET | `/physical-records/{id}/movements` | Movement history |
| POST | `/physical-records/{id}/loan` | Create loan |
| POST | `/physical-records/{id}/return` | Return from loan |
| GET | `/physical-records/overdue-loans` | List overdue loans |
| GET | `/physical-records/scan/{barcode}` | Scan and retrieve |
| GET | `/physical-records/{id}/label` | Generate barcode/QR label |
| GET | `/storage-locations` | List locations (tree) |
| POST | `/storage-locations` | Create location |
| PUT | `/storage-locations/{id}` | Update location |

---

## Disposal

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/disposal/candidates` | List disposal candidates |
| POST | `/disposal/batches` | Create disposal batch |
| GET | `/disposal/batches/{id}` | Get batch details |
| POST | `/disposal/batches/{id}/approve` | Approve batch |
| POST | `/disposal/batches/{id}/execute` | Execute disposal |
| GET | `/disposal/batches/{id}/certificate` | Download certificate PDF |

---

## Archive Transfer

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/archive/batches` | Create transfer batch |
| GET | `/archive/batches/{id}` | Get batch details |
| POST | `/archive/batches/{id}/records` | Add records to batch |
| POST | `/archive/batches/{id}/validate` | Validate batch |
| POST | `/archive/batches/{id}/finalize` | Finalize batch |
| POST | `/archive/batches/{id}/complete` | Mark as completed |
| GET | `/archive/batches/{id}/manifest` | Download manifest PDF |

---

## Search

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/search` | Execute search query |
| GET | `/search/suggestions` | Get search suggestions |

---

## Security

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users` | List users |
| GET | `/users/{id}/roles` | Get user roles |
| POST | `/users/{id}/roles` | Assign role |
| DELETE | `/users/{id}/roles/{roleName}` | Revoke role |
| POST | `/auth/re-authenticate` | Re-authenticate for sensitive ops |

---

## Audit

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/audit/logs` | Query audit logs (paginated) |
| GET | `/audit/compliance/metrics` | Get compliance metrics |
| POST | `/audit/compliance/report` | Generate compliance report |

---

## Administration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/admin/config` | Get all settings |
| PUT | `/admin/config/{key}` | Update setting |
| GET | `/admin/lookups/{type}` | Get lookup values |
| POST | `/admin/lookups/{type}` | Create lookup value |
| PUT | `/admin/lookups/{type}/{code}` | Update lookup value |
| GET | `/admin/jobs` | List scheduled jobs |
| PUT | `/admin/jobs/{id}` | Update job config |

---

## Reports

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/reports/types` | List available report types |
| POST | `/reports/generate` | Generate report (PDF/Excel) |
| GET | `/dashboards/{role}` | Get dashboard data |

---

## Error Response Format

All errors follow this structure:

```json
{
  "code": "VALIDATION_ERROR",
  "message": "Human-readable error message",
  "detail": "Additional context (optional)",
  "traceId": "correlation-id-for-troubleshooting"
}
```

### HTTP Status Codes

| Code | Meaning |
|------|---------|
| 400 | Validation error (missing/invalid fields) |
| 401 | Authentication required or session expired |
| 403 | Insufficient permissions (role/classification) |
| 404 | Resource not found |
| 409 | Conflict (e.g., duplicate registry number) |
| 429 | Rate limited |
| 500 | Internal server error |
| 502 | Bitrix service unavailable |

---

## Authentication

All API requests (except `/auth/login` and `/auth/bitrix/callback`) require a valid session cookie. The session is established after successful OAuth flow.

### Headers

```
Cookie: .rmrs.session=<session-token>
```

### Session Timeout

Sessions expire after 30 minutes of inactivity. When expired, the API returns `401` and the client should redirect to `/auth/login`.
