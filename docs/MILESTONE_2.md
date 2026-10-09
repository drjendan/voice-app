# Milestone 2 - Voice Restoration POC

## Goal
Prove that Evolve AI Vocal can ingest a test vocal, analyze it, apply controlled restoration processing, compare original/restored outputs, and establish the model pipeline required for an authorized artist voice profile.

## Outstanding dependencies carried from Milestone 1
- Supabase environment setup and security verification
- Netlify deployment/configuration

These do not block engineering, but real artist recordings remain prohibited until Supabase security verification is complete.

## Phase 2A - Audio Intelligence Foundation
- Validate uploaded audio
- Decode WAV safely
- Standardize sample rate/channel layout
- Analyze duration, sample rate, channels, peak level, RMS level, crest factor, clipping, DC offset, and zero-crossing rate
- Generate a simple quality/readiness score
- Provide a development-only synthetic test signal

## Phase 2B - Artist Voice Profile
- Historical/current recording dataset structures
- Era tagging
- Clip curation
- Training suitability metadata
- Model experiment registry
- No real artist training until authorization + Supabase verification

## Phase 2C - Restoration Engine POC
Initial POC uses deterministic DSP, not voice cloning:
- DC removal
- high-pass cleanup
- gentle presence shaping
- soft compression
- peak normalization
- wet/dry restoration-strength mix

This gives us a safe integration path and UI workflow while the model architecture is evaluated.

## Phase 2D - Evaluation
- A/B original vs restored
- Multiple restoration strengths
- Objective signal metrics
- Processing-time measurement
- Listening notes
- Model-candidate comparison

## Exit criteria
1. Test WAV can be uploaded in POC test mode.
2. Analysis metadata is returned.
3. Restored test WAV is produced.
4. Restoration strength changes output measurably.
5. Original/restored can be auditioned in the web UI.
6. POC mode rejects unsupported/non-WAV inputs.
7. Real artist data gate remains documented and enforced.


## Deployment
Frontend: Netlify from `milestone-2-voice-restoration-poc`.

Audio API: Render Blueprint via `render.yaml`.
Required backend environment variables:
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `APP_ENV=staging`
- `ENABLE_POC_TEST_MODE=true`
- `ALLOWED_ORIGINS=https://sage-zabaione-c58f51.netlify.app`

After the audio API is deployed, set the Netlify frontend environment variable:
- `VITE_AUDIO_API_URL=https://<render-service-host>`

Then redeploy the Netlify site.

POC test mode is temporary. Before production release, set `ENABLE_POC_TEST_MODE=false` and route real artist processing only through authenticated, authorization-gated jobs.
