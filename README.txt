FORMA v2 — iPhone web app (PWA)

INSTALLATION
1. Host *all files* in this directory together on any HTTPS static site (e.g. GitHub Pages).
2. Open the live website in iPhone Safari.
3. Share > Add to Home Screen > Open as Web App > Add.
4. Start FORMA from the Home Screen. Once cached, the core app can run offline.

NO BACKEND: workout records are stored locally in this web app's own browser storage.
Use the Data tab to export JSON to Files/iCloud after several sessions. Import can restore data and accepts the previous FORMA v1 backup format. Opening a downloaded .html from Files DOES NOT install the PWA. Existing storage for a downloaded v1 file doesn't migrate automatically; export/import its JSON.

SMART SUGGESTIONS
- Compare multiple sessions of the exact same exercise, not just the last workout.
- Require two comparable sessions at top of rep range, with recorded 2+ reps in reserve, before proposing a small weight increase.
- Guard against a jump larger than 10%, poor sleep, low energy, pain, 14+ day breaks, or plateaus.
- Reduce sets for 25/40-minute days or reduced readiness.
- Recommendations are NOT instructions. Always use a manageable load, prioritize technique, do not exercise through pain.

TESTING: run 'node test-engine.js' (pure engine tests).

If hosting under a repository subpath, relative URLs already work.
No account, paid API, remote AI, or cloud sync.
