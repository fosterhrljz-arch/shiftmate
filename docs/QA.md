# ShiftMate v1.1 release verification

Verified on 2026-11-13 using fictional Harbor Table employees. No actual employee files or normal user browser profiles were used.

## Environment and method

The Browser plugin was not available. Playwright used the installed Chrome and Edge browsers on Windows, opening the built `ShiftMate.html` directly by file URL with networking disabled. Separate temporary profiles tested complete browser shutdown and restart.

Viewports: 1536 × 1024, 1280 × 720, 390 × 844 and 320 × 740. Mobile results are browser emulation, not native phone testing.

## Results

| Check | Result |
| --- | --- |
| Page identity | Correct standalone file URL and ShiftMate v1.1 title |
| Initial render | Welcome choice visible; no sample employees written until requested |
| Runtime health | No page/console errors, blank screen or framework overlay |
| Network | Zero HTTP requests during both workflows |
| Demo isolation | Demo import/employee guards work; business survives switching and reload |
| Upgrade | Mixed v1.0 fixture becomes one selected real employee; eight known demo employees excluded; original nine-record storage unchanged |
| Detection | Summary-only CSV blocked; XLSX with leading summary selects roster; header row 4 recognized |
| Import | CSV, XLSX, legacy XLS; seven employees, repeated roles merged, Grand Total excluded; shift-specific roles retained |
| Correction | Conflicting pay blocks Save; correcting the cell enables an atomic save |
| Scheduling | Four weekday requirements create 20 shifts and cover all 90 hours; manual imported assignments preserved |
| Conflict protection | Overlapping manual shift rejected |
| Leave and cover | Approving Nina’s Tuesday leave opens its shift; replacements displayed; replanning restores all 20 assignments without conflicts |
| Exports | Actual XLSX and PDF files downloaded in both browsers; JSON backup downloaded and restored |
| Persistence | Reload and complete process restart pass in Chrome and Edge; stale tab prevented from overwriting newer changes |
| Mobile | All pages reachable; no document overflow; availability inputs fit; save footer stays visible; an employee saved at 390px; import edited using record cards |
| Visual evidence | Actual screenshots captured in `docs/01-*.png` through `12-*.png`; welcome, calendar, import, mobile and rendered PDF inspected |

## Independent checks

`npm test`: **50 passed, 0 failed**. This includes 60 randomized small-roster comparisons with an exhaustive enumeration oracle, classic greedy traps, role combinations, manual locks, time-limit reporting, rest/leave/availability constraints, multi-role imports, ambiguous pay, Excel date systems, summaries, corrupt storage and export totals.

Python openpyxl opened the actual browser-exported workbook: four expected sheets, 20 shift rows, CNY currency, 90 scheduled hours, zero open shifts and CNY 2,344 estimated labor after leave. Row totals equal the summary, and cells are stored without formulas. PyMuPDF independently rendered the one-page landscape PDF for visual inspection; names, time off, roles, times and the same totals are visible without clipping.

Commands: `npm test`, `npm run build`, `node tests/ui.mjs`, `node tests/persistence.mjs`; repeat the browser commands with `BROWSER_CHANNEL=msedge`. `SHIFTMATE_CAPTURE_DOCS=1` refreshes the illustrated guide’s screenshots. Core tests do not require a browser.

## Practical limits

Scheduling is bounded search; a time/node cutoff is explicitly reported and does not certify a maximum. Workload balancing is a candidate preference, not a separate fairness optimum. Maximum-size workspaces were not benchmarked. Native phone browsers, Safari, Firefox and screen readers were not verified. Local persistence depends on retaining the same file path and browser profile; backups remain necessary.
