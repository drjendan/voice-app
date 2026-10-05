# Evolve AI Vocal - Milestone 1 Deployment Security Checklist

Milestone 1 code is complete only after a target environment passes these verification gates.

## Identity
- [ ] Supabase project created for this application only.
- [ ] Email verification enabled.
- [ ] Privileged users enrolled in TOTP MFA.
- [ ] Session timeout/refresh settings reviewed.
- [ ] No shared administrator accounts.

## Database isolation
- [ ] Migrations 0001 through 0004 applied successfully.
- [ ] RLS enabled on every tenant/artist table.
- [ ] Two disposable organizations and artists created.
- [ ] The RLS smoke-test assertions in supabase/tests/rls_smoke.sql are verified.
- [ ] Cross-tenant reads and writes confirmed denied.

## Storage
- [ ] artist-audio, artist-models, and authorization-docs buckets are private.
- [ ] Anonymous object access returns denied.
- [ ] Signed upload succeeds only for authorized artist roles.
- [ ] Signed read URL expires as expected.
- [ ] Cross-artist object path access is denied.
- [ ] Model weights are not exposed through the normal browser workflow.

## API
- [ ] SUPABASE_URL and SUPABASE_ANON_KEY configured in server runtime only.
- [ ] Invalid/missing JWT returns 401.
- [ ] Valid user without artist membership returns 403.
- [ ] Draft/revoked authorization returns 403.
- [ ] Model tied to a different artist/authorization returns 403.
- [ ] Valid security chain reaches the intentional Milestone 2 501 boundary.

## Audit
- [ ] Artist creation is logged.
- [ ] Authorization changes are logged.
- [ ] Recording metadata changes are logged.
- [ ] Model metadata changes are logged.
- [ ] Processing-job changes are logged.
- [ ] Authenticated users cannot update/delete audit events.

## Source and secrets
- [ ] No production .env file exists in Git.
- [ ] No audio/model files exist in Git history.
- [ ] No Supabase service-role key exists in browser code or repository history.
- [ ] Production and development credentials are separate.

## Production-data gate
Do not load real artist recordings or train a real voice model until every applicable item above is verified and documented.
