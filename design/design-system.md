# ShiftMate design specification

Concept: `concept.png`, generated with the built-in image generation tool. Prompt: full desktop weekly employee scheduling interface; white sidebar, pale gray canvas, indigo actions, flat pastel role blocks, eight employee rows, weekly toolbar and four live metrics. Remaining requested pages extend this system with tables, forms and modal dialogs.

Tokens: canvas #f6f7f9; surface #ffffff; text #17192e; secondary #687083; border #e1e4ed; primary #6155d9; primary tint #eeebfd. White sidebar 230px; main gutter 28px; system sans-serif. Title 30px/700; body 14px/1.5; control 13px/600; captions 12px. Corners 8px. No gradients or photographic assets. Lucide outline icons 18px/1.8px. Native text S monogram is a code-native UI brand mark.

Pages: Schedule, Employees, Time off, Import data, Reports, Settings. Core components: sidebar, page header, stats band, week toolbar, weekly table, role-colored shift button, employee avatar, editable data table, form dialog, notice, toast, empty state. Mobile: horizontal navigation and scrollable calendar with sticky employee column; single-column forms.

Necessary deviations from illustrative concept: all totals derive from actual sample records; dates follow the local machine's week; employee subtitle includes actual scheduled hours; week/date control is a navigable date input; conflict notices, search, empty states and accessible forms added for required behavior. No decorative imagery in runtime.

## Visual verification

Compared `concept.png` with the actual standalone-file screenshot at the native 1536 × 1024 size using `view_image`. Also checked 1280 × 720 and 390 × 844. Browser plugin unavailable; regular Playwright drove installed Chrome and Edge with networking disabled.

| Comparison | Rendered result and resolution |
| --- | --- |
| Sidebar and page anatomy | Fixed white sidebar, same navigation order, workspace name and local-save footer retained. Pending leave count added for the working workflow. |
| Palette and surfaces | Pale gray canvas, white table, indigo primary actions, matching pastel role colors; no gradients or photographic assets. |
| Typography and controls | Native sans-serif hierarchy, 34px desktop title, explicit 12–14px calendar/control text. Native system fonts keep offline portability. |
| Calendar density and spacing | Eight sample employees plus open shifts and seven equal day columns. Initial row sizing pushed the legend offscreen; reduced row height so the entire sample calendar and legend fit at 1536 × 1024. |
| Component and icon treatment | Consistent outlined Lucide navigation/actions, circular initials avatars, small flat shift blocks and thin borders. Calendar is fully interactive native markup. |
| Copy audit | Main heading, subtitle, navigation and main actions preserved. Live totals replace illustrative values (168h and USD 3,380); 24-hour times replace AM/PM for compact readability. Role legend sorts by role. Current-day highlighting and request count are intentional functional additions. |
| Responsive behavior | Horizontal navigation and a horizontally scrollable calendar with sticky employee column at 390px. Form dialogs keep action buttons visible. Document width stays within viewport. |
| Reports and exports | Fixed daily chart baseline misalignment by reserving space for open-shift labels. PDF keeps ordinary rows together across pages and uses compression; independent Poppler render checked. |

No unresolved material layout defects were observed in the verified surfaces. The implementation preserves the concept's visual system with the functional deviations listed above. UI flows were also verified separately; visual review does not substitute for functional checks.

## v1.1 reliability changes

The desktop palette, typography, sidebar, tables, role chips and modal styling are preserved. The welcome choice and import detection panel extend the existing components. Real and demo workspaces have separate storage and a persistent demo banner.

Mobile navigation now shows all six pages in a 3-by-2 grid. The weekly calendar retains horizontal scrolling and a sticky employee column with an explicit swipe hint. Modal headers and save footers stay visible while fields scroll. Review uses labelled, expandable records on small screens. CNY totals fit in the metric cards.

The v1.1 HTML was exercised offline in Chrome and Edge at 1536, 1280, 390 and 320px widths. Actual app screenshots in ../docs/ replace mockups as the usage guide’s evidence. Verified comparisons: unchanged desktop visual system, all navigation reachable on mobile, no document overflow, fitting time inputs, visible save actions and readable record correction. The independent PDF render also retains complete rows and its CNY totals.
