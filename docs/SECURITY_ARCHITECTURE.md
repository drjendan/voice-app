# Security Architecture

## Security objective
Protect each artist's recordings, derived training material, voice models, authorization records, and processed outputs as high-value assets. The platform assumes credentials, devices, and networks may be compromised and therefore applies least privilege and tenant/artist isolation.

## Crown-jewel assets
- Historical master recordings and isolated vocal stems
- Current private performances
- Training datasets and embeddings
- Voice-model files and model versions
- Unreleased restored audio
- Authorization documents

These assets must never be committed to Git, stored in public buckets, or exposed through permanent public URLs.

## Trust boundaries
1. Browser application: untrusted client. Never receives service-role credentials or direct model files.
2. Supabase Auth/Postgres: identity, tenant membership, artist membership, metadata, RLS enforcement.
3. Private object storage: encrypted audio/model objects addressed by private paths.
4. Audio API: trusted processing boundary. It validates user identity, artist membership, authorization status, requested model, and asset scope before processing.
5. Model runtime: isolated service/worker. Models are invoked rather than downloaded to normal users.

## Required production controls
- MFA for privileged and artist-facing accounts
- Row-level security on every tenant/artist table
- Separate production/dev environments
- Private storage buckets only
- Short-lived signed URLs
- Server-side upload validation and file-size/type limits
- Malware scanning where applicable
- Rate limiting and brute-force protection
- Secret management outside source control
- Audit logging for login, upload, playback, processing, export, permission changes, and failed access
- Automatic access revocation when membership or authorization expires
- Backup encryption and tested recovery
- Incident response procedure

## Authorization gate
No restoration job should begin unless:
1. the user is authenticated;
2. the user has access to the artist;
3. an active artist authorization covers the requested use;
4. the requested model version is approved and tied to that authorization;
5. input and output assets resolve to the same artist scope;
6. an audit event is emitted.

## Model protection
Normal users should never receive downloadable model weights. The web app requests processing from the audio service. Higher-security deployments may use per-artist encryption keys and encrypted edge-performance packages bound to approved devices.

## Milestone 1 safety rule
Real artist material remains disabled until authentication, MFA, database RLS, private storage, signed URLs, and audit controls are configured and verified in the deployment environment.
