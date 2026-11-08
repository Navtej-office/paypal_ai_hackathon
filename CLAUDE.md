# Dealflow
AI payment assistant for Indian creators paid by foreign brands via PayPal (sandbox only). Built for the PayPal AI Hackathon, deadline Nov 12.

## Rules
- Test-driven development: write one small failing test, run it and show it fails, then write the minimum code to pass, run again, then stop for review.
- Never write code without a failing test first, except config and UI.
- Pure logic lives in src/domain with no network or database calls.
- Money is stored as integer cents, never floats.
- PayPal and Claude API calls are passed in as functions so tests can use fakes. Never call real APIs in unit tests.
- Never read, print, or commit .env.local or any secret.
- One module per step. Commit after each green test run with a conventional commit message.
- Keep code simple. No new dependencies without asking me first.
