# Week 8 Technical Assessment

Reviewed November 9, 2026. Repository: `Michelle-Sainsbury/l2assessment`.
Baseline commit: `1b5451fd38aa056bba55cf7331a190989d6cbdd5`.
This report records the implementation and pre-commit verification. No API keys
were required or used.

## Original app and checks

The app is React 19 with Vite, Tailwind and React Router. The README describes
Groq categorization plus rule-based urgency, but `/analyze` actually renders
`components/triagedashboard.jsx`, which calls `services/triageservice.js`
(OpenAI). The older `pages/AnalyzePage.jsx` uses Groq, the urgency scorer,
recommendation templates and localStorage history, but is not routed.

After installing dependencies with `npm ci`:

| Original check | Result |
| --- | --- |
| `npm run build` | Passed on this Mac; 238 modules transformed |
| `npm run lint` | Failed: six errors |
| Automated tests | No test script or automated tests supplied |

Original lint errors: helper functions accessed before declaration in Dashboard
and History, synchronous state updates in Home's effect, two unused variables
in `llmHelper.js`, and the unused `urgency` argument in `templates.js`.
Imports for TriageDashboard, its stylesheet and triageService differ in casing
from tracked filenames. macOS resolved them, but case-sensitive systems may fail.

## Original scorer: measured results

Ran the actual original `calculateUrgency` function against all eight messages
in `sample-messages.json` before editing it. Evaluation used an isolated VM and
controlled local dates: Monday November 9 at noon and 10 p.m., and Sunday
November 8 at 10 p.m. All eight labels were identical across these three times.
Full inputs and measured outputs are preserved in `original-urgency-results.json`.
The fixture's `expectedIssues` text is descriptive, not an assertion of measured behavior.

| ID | Supplied example | Original urgency | Final urgency |
| --- | --- | --- | --- |
| 1 | Database connection lost | Low | High |
| 2 | Friendly thank-you | Medium | Low |
| 3 | Export to CSV feature request | Low | Low |
| 4 | Payment failure + dashboard access problem | Low | Medium |
| 5 | hi | Low | Low |
| 6 | Server down now | Low | High |
| 7 | Long positive design feedback | High | Low |
| 8 | Business hours question | Low | Low |

Sample 2's description says High, but the original code returns **Medium**:
50 base + 60 for two exclamation marks - 30 for `thank` and `appreciate`
= 80 during weekday business hours. The message contains the word `question`,
but no question mark; High requires a score strictly greater than 80.

## Top three problems, ranked

1. **Urgency is driven by formatting, not impact.** Short messages lose 40
   points below 50 characters and another 60 below 20; there is no incident
   detection. Each `!` adds 30, so praise can outrank an outage. Uppercase,
   politeness and questions reduce priority, even when describing a critical
   incident. Weekend/night deductions can also change priority for identical
   content. Fixed by the content-based scorer below.
2. **The active analysis workflow bypasses the scorer.** Fixing only the utility
   would have no effect on `/analyze`. The active service accepts AI priority
   verbatim and falls back to Medium for every message. It also has a separate
   queue model from the older page: new queue tickets are not saved to the
   history used by Home, History and Dashboard. Fixed the scoring integration
   and import casing. Unifying queue persistence/history remains follow-up work.
3. **API credentials are handled by the browser.** The older Groq client uses
   `VITE_GROQ_API_KEY` and `dangerouslyAllowBrowser: true`; the active dashboard
   accepts an API key and sends requests directly from the browser. Vite keys
   can be included in client assets, and browser requests expose credentials
   to the person controlling that browser. A backend credential boundary is
   needed before deployment. This assessment used no real credentials and
   did not create an environment file. Removing the unused legacy page import
   removes its Groq helper from the active bundle; this does not constitute a
   full security fix. The active page now supports local scoring without a key.

Other observed issues: the legacy Feature Request template tells users to check
billing; the AI categorizer uses free-form substring parsing and temperature
0.7, so ambiguous classification needs structured output and validation; `hi`
passes nonempty-only validation. These findings are based on source inspection,
not live AI calls. No minimum character limit was added because it would reject
valid short incidents. These issues were kept outside the urgency change.

## Implemented changes

- Replaced numeric formatting penalties with ordered rules: critical incident or
  explicit urgency signals → High; ordinary technical/payment problems → Medium;
  routine questions, greetings, feature requests and praise → Low. Unknown content
  defaults to Medium for review. Empty/non-string scorer input returns Low;
  the active service rejects empty input before attempting a request.
- Incident signals take precedence over thanks, polite language and question
  marks. Matching is case-insensitive, uses word boundaries, and normalizes
  curly apostrophes. Basic explicit denials such as `not urgent`, `no outage`
  and `server is not down` are removed before critical matching.
- Removed all dependence on local time, length, uppercase and exclamation count.
- Made the shared scorer authoritative for `priority` in the active service,
  after successful AI classification and in every fallback. AI category/routing
  and manual priority overrides remain available. Newly analyzed messages use
  Low/Medium/High; existing demo tickets and manual choices can still use Urgent.
- Missing/blank keys return a local fallback immediately without a network call.
  Category/routing remain General Support/General Queue in that fallback.
- Corrected import casing to match tracked files and removed the unused legacy
  AnalyzePage import. Fixed baseline lint errors with lazy localStorage state
  initialization and derived page metrics, removed unused helper variables and
  the unused recommendation argument. No lint rules were disabled.
- Added Node's built-in test runner with no new dependencies. Package lock and
  dependency versions are unchanged.

## Final verification

Environment: Node v24.21.0, npm 11.19.0, macOS.

| Command | Final result |
| --- | --- |
| `npm test` | Passed: 41 tests, 0 failures |
| `npm run test:examples` | Passed: prints all 8 supplied samples and 5 new examples |
| `npm run lint` | Passed: 0 errors, 0 warnings |
| `npm run build` | Passed: 210 modules transformed |
| `git diff --check` | Passed |

Tests assert all eight supplied labels; 27 new cases cover critical short input,
uppercase, punctuation, polite incidents, ordinary problems, basic negation,
empty/non-string input and the word-boundary case `download`. A clock test checks
weekday/daytime, nighttime and weekend stability. Five service tests verify that
success, network failure, HTTP failure and malformed-response fallback use the
same priorities, missing keys make no request, and empty messages are rejected.
All API responses are mocked; no external API request or real key is used.

Additional example results:

| New message | Result |
| --- | --- |
| Please help, our production server is down. Thank you! | High |
| THANK YOU FOR THE EXCELLENT HELP!!! | Low |
| Thanks, but I can't access the dashboard | Medium |
| No outage, thank you! | Low |
| Security breach detected | High |

The build prints a non-failing stale Browserslist data warning. The online
baseline dependency installation reported 21 dependency vulnerabilities
(1 low, 5 moderate, 15 high). Dependencies were not upgraded in this focused
change; the later offline install's zero-vulnerability output is not a fresh
security audit and should not be interpreted as remediation.

These checks exercise the actual scorer and active service, plus compilation and
static analysis. No browser interaction or live AI categorization was tested.
The English rules are deliberately limited: quoted or historical incidents,
complex negation, hypothetical requests and other languages may need human
review or more sophisticated parsing. The queue's existing history disconnect,
legacy feature template and browser credential architecture remain as noted.

## Reproduce

Use Node 22.12+ or Node 24 (the old README's Node 16 minimum is insufficient for
the installed Vite toolchain). From the repository root:

```sh
npm ci
npm test
npm run test:examples
npm run lint
npm run build
```

For a local dashboard review, run `npm run dev`, open `/analyze`, leave the API
key blank and submit `Server down now`, then `Thank you!!!`. They should appear
as High and Low respectively, with the existing fallback banner and generic
category/routing.
