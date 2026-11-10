# Main endpoints
Auth: POST `/auth/register`, POST `/auth/login`, POST `/auth/logout`, GET `/auth/me`.
Profiles: GET `/profiles/:username`, PATCH `/profiles/me`.
Documents: POST/GET `/documents`, GET/PATCH/DELETE `/documents/:id`.
Levels: POST/GET `/levels`, GET/PATCH/DELETE `/levels/:id`, POST `/levels/:id/publish`, POST `/levels/:id/play`.
Worlds: POST/GET `/worlds`, GET/PATCH/DELETE `/worlds/:id`.
Assets: POST/GET `/assets` (URL references only).
Ranks: GET `/ranks`; credits: GET `/users/me/credits`.
Admin: POST `/admin/bootstrap`, GET `/admin/users`, PATCH `/admin/users/:id/rank`, GET `/admin/audit`.
Rotur: POST `/payments/rotur/verify` only after configuring trusted verifier.
