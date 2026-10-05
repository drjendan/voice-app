# Evolve AI Vocal

Secure, authorized vocal preservation and restoration platform for studio and live-performance use.

## Milestone 1
The secure platform foundation is implemented on the milestone-1-secure-platform-foundation branch. It includes authentication, TOTP MFA enrollment, tenant and artist isolation, private storage policies, signed audio upload/access, artist authorization gates, audit logging, and an authenticated FastAPI boundary for future restoration processing.

Real artist material must not be loaded until the target Supabase environment passes docs/DEPLOYMENT_SECURITY_CHECKLIST.md.

## Milestone 2
After security verification, the next phase is the Voice Restoration POC: evaluate authorized historical/current recordings, build the first approved artist voice profile, and test controlled restoration before real-time performance processing.
