# Universe Backend
Deployable Node.js 20+ / PostgreSQL backend.

## Render deployment
1. Extract the ZIP and push both folders to a GitHub repository, preserving their names.
2. Render → New → Blueprint → select the repository. `render.yaml` sets `rootDir: blueprint`.
3. Create PostgreSQL. Set the service's `DATABASE_URL` to the database's internal URL.
4. Set `CORS_ORIGINS` to your exact game/editor origins. Keep secrets private.
5. Deploy and open `/health`.
6. In the service shell run `npm run migrate`.
7. Register your own account. Then call `POST /api/v1/admin/bootstrap` with header `X-Admin-Bootstrap-Key` and JSON `{"identity":"your_username"}`. This only works once.
8. Keep `ADMIN_BOOTSTRAP_KEY` private. Delete/rotate it after bootstrap.

## Scope and important limitations
Includes authentication, profiles, documents, levels, worlds, asset URL registry, ranks/entitlements reads, credit ledger reads, admin bootstrap/rank management/audit.
Assets store HTTPS references, not uploaded files. Rotur endpoint is deliberately disabled unless a trusted verifier is configured. The adapter contract is described in `docs/ROTUR.md`; it is not a claim about Rotur's native API. UDBA status is exposed, but archive import/export is not implemented in this build. Add rate limiting, email verification, password reset, moderation, backups and a privacy policy before public launch.
