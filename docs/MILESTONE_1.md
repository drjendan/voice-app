# Milestone 1 - Secure Platform Foundation

## Goal
Create the minimum trustworthy platform required before any real artist recording or model enters the system.

## Included in this branch
- React/TypeScript application shell
- Dashboard
- Artist Digital Vault shell
- Voice Library shell
- Restoration Studio shell
- Live Performance shell
- Security & Audit screen
- FastAPI audio-service boundary
- Supabase client configuration
- Initial multi-tenant + artist-scoped schema
- Row-level-security baseline
- Authorization records
- Processing jobs and audit events
- Source-control protections for secrets, audio, and model assets

## Intentionally disabled
- Artist enrollment writes
- Recording uploads
- Model training
- Restoration processing
- Live microphone processing
- Audio export

These features remain disabled until their production security controls are implemented and verified.

## Exit criteria
1. Supabase project configured for the application.
2. MFA policy decided and enabled for privileged users.
3. Migration applied and RLS verified with multiple test users/tenants.
4. Private audio/model buckets created.
5. Signed upload/download flows implemented.
6. Role matrix enforced server-side.
7. Audit hooks record sensitive actions.
8. Audio API verifies JWT + artist authorization.
9. No production secrets appear in browser bundles or Git history.
10. Security tests demonstrate cross-tenant and cross-artist access is denied.
