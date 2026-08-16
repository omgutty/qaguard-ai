Update the existing dashboard UI to match the visual style of the provided “QA Copilot / QA Engineering Overview” reference design.

IMPORTANT:
- Do NOT change existing business logic, functionality, API integrations, routes, data models, test-generation logic, automation logic, or component behavior.
- Do NOT remove existing features.
- This task is primarily a UI/UX redesign and theme implementation.
- Preserve all existing functionality while updating the visual design.

==================================================
1. OVERALL DESIGN DIRECTION
==================================================

Create a modern enterprise-grade AI QA Engineering dashboard.

Visual style:
- AI engineering platform
- Technical
- Premium
- Clean
- Minimal
- Professional
- High information density without looking cluttered
- Similar visual language to modern developer tools such as GitHub, Linear, Vercel, and AI engineering platforms.

Primary theme:
- DARK MODE

Default appearance:
- Dark mode

Add a theme toggle so users can switch between:
- Dark Mode
- Light Mode

The theme toggle must work globally across the entire application.

==================================================
2. DARK MODE COLOR SYSTEM
==================================================

Use these colors as the primary design tokens.

Main application background:
#0B0F19

Sidebar / navigation background:
#0F172A

Card background:
#1E293B

Secondary card / elevated surface:
#162033

Borders / dividers:
#334155

Primary text:
#F8FAFC

Secondary text:
#94A3B8

Muted text:
#64748B

Primary accent:
#6366F1

AI / technology accent:
#06B6D4

Teal accent:
#14B8A6

Success:
#10B981

Failure / Error:
#EF4444

Warning / Processing:
#F59E0B

Code editor background:
#011627

Use the colors consistently through CSS variables/design tokens instead of hardcoding colors throughout individual components.

==================================================
3. COLOR USAGE RULE
==================================================

Follow approximately a 60-30-10 visual distribution.

60%:
- Dark backgrounds
- Page canvas
- Sidebar
- Large surfaces

30%:
- Cards
- Secondary surfaces
- Borders
- Typography
- Supporting UI structure

10%:
- Indigo
- Cyan
- Teal
- Status colors
- Buttons
- Active navigation
- AI indicators
- Important interactions

Do NOT make the entire dashboard colorful.

The dashboard should remain predominantly dark navy/charcoal with controlled accent usage.

==================================================
4. SIDEBAR
==================================================

Create a dark vertical sidebar.

Sidebar background:
#0F172A

Include navigation such as:

Dashboard
Requirements
Test Cases
Test Data
Automation
AI Analyzer
AI Generator
AI Healer
Reports
Traceability
Settings

Design:
- White primary navigation text
- #94A3B8 for inactive items
- #6366F1 for active navigation
- Subtle indigo glow/background around active item
- Small clean icons
- Consistent spacing
- Rounded active navigation item
- Avoid excessive gradients

Example active item:

Background:
rgba(99, 102, 241, 0.15)

Border/accent:
#6366F1

Text:
#FFFFFF

==================================================
5. TOP HEADER
==================================================

Create a clean top navigation/header.

Include:
- Application logo/name
- Global search
- Notifications
- Help
- Theme toggle
- User profile

Header should use:
#0B0F19 / #0F172A

Add subtle bottom border:
#334155

Search field:
- Dark surface
- Rounded corners
- Subtle border
- Search icon
- Placeholder text in #94A3B8

==================================================
6. THEME TOGGLE
==================================================

Add a clearly visible Light/Dark theme toggle in the top header.

Requirements:
- Dark mode should be the default.
- Clicking the toggle switches the entire application to Light Mode.
- Clicking again returns to Dark Mode.
- Persist the selected theme using localStorage or the application's existing theme mechanism.
- Do not reload the page when switching themes.
- Use smooth transition animation.

Toggle should visually communicate the current mode.

Dark mode:
- Moon / dark icon
- Indigo accent

Light mode:
- Sun / light icon
- Indigo accent

Example:

[ ☾  ● ] Dark

or

[ ☀  ● ] Light

Use a modern pill-style toggle.

==================================================
7. DASHBOARD BACKGROUND
==================================================

Use:

#0B0F19

Do not use pure black (#000000).

The background should feel like a premium developer/AI platform.

Use very subtle gradients only where appropriate.

Optional subtle background gradient:

#0B0F19 → #0F172A

Do not use strong gradients that distract from dashboard content.

==================================================
8. DASHBOARD CARDS
==================================================

Cards should use:

Background:
#1E293B

Border:
#334155

Border radius:
10px - 14px

Cards should have:
- subtle border
- minimal shadow
- consistent padding
- clear hierarchy

Avoid glassmorphism everywhere.

Avoid excessive shadows.

Use subtle elevation differences between:
- page
- card
- modal
- dropdown
- code editor

==================================================
9. KPI CARDS
==================================================

Create modern metric cards for things such as:

Requirements
Test Cases
Automation Scripts
Quality Score

Example:

Requirements
128
↑ 12.4% vs last week

Use:
- Large white number
- Small secondary label
- Trend indicator
- Small colored icon

Suggested icon colors:

Requirements:
#6366F1

Test Cases:
#06B6D4

Automation:
#14B8A6

Quality:
#10B981

Do not overuse color.

==================================================
10. AI REQUIREMENT ANALYSIS
==================================================

Create a prominent card titled:

AI Requirement Analysis

Example content:

AUT-487 — User Login Functionality

✓ Requirement understood
✓ Acceptance criteria identified
✓ Business rules extracted
⚠ 2 requirement gaps detected
⚠ 1 risk identified
✓ Test data requirements extracted

Use semantic colors:

Success:
#10B981

Warning:
#F59E0B

AI indicators:
#06B6D4

Primary action:
#6366F1

Buttons:

[ View Analysis ]

[ Generate Test Cases ]

The “Generate Test Cases” button should be the primary CTA.

==================================================
11. TEST CASE STATUS COLORS
==================================================

Passed:
#10B981

Failed:
#EF4444

Running:
#F59E0B

Blocked:
#64748B

Draft:
#94A3B8

Use small pills/badges.

Example:

Passed
green subtle background

Failed
red subtle background

Running
amber subtle background

Do NOT use large solid blocks of status colors.

==================================================
12. AUTOMATION HEALTH
==================================================

Use a clean visual representation such as:

87%
Healthy

Show:

Total Scripts
Stable
Flaky
Broken

Recommended:

Stable:
#10B981

Flaky:
#F59E0B

Broken:
#EF4444

Charts should be minimal and technical.

==================================================
13. CODE / AUTOMATION SECTION
==================================================

Automation code should use a dedicated code-editor-style panel.

Code editor background:

#011627

This area should visually feel different from normal dashboard cards.

Use syntax highlighting.

For Playwright TypeScript, use appropriate colors for:

Keywords
Functions
Strings
Variables
Assertions
Comments

Do not make syntax highlighting overly bright.

Include actions such as:

[ Run Test ]
[ View in IDE ]
[ Copy Code ]
[ Download ]

Primary Run Test button:
#6366F1

==================================================
14. BUTTON DESIGN
==================================================

Primary button:
Background:
#6366F1

Text:
#FFFFFF

Hover:
slightly brighter indigo

Secondary button:
transparent/dark surface

Border:
#334155

Text:
#E2E8F0

AI button:
Use subtle cyan/indigo treatment.

Buttons should:
- have 8px-ish radius
- have clear hover state
- have clear disabled state
- have focus state
- avoid excessive rounded/pill styling except for status badges and theme toggle

==================================================
15. TYPOGRAPHY
==================================================

Use a modern UI font.

Preferred:
Inter

Fallback:
system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif

Typography hierarchy:

Page title:
24px–28px
font-weight: 600/700

Section title:
16px–18px
font-weight: 600

Card title:
14px–16px
font-weight: 600

Body:
14px

Secondary:
12px–13px

Large KPI number:
28px–36px
font-weight: 700

Do not use excessive font sizes.

==================================================
16. LIGHT MODE
==================================================

The Light Mode should NOT simply invert the dark mode.

Create a professional clean light theme inspired by modern AI chat applications such as Claude.

Use:

Main background:
#F7F7F8

Sidebar:
#F2F2F0

Card:
#FFFFFF

Elevated card:
#FFFFFF

Border:
#E5E7EB

Primary text:
#171717

Secondary text:
#475569

Muted text:
#64748B

Primary accent:
#6366F1

AI accent:
#14B8A6

Success:
#10B981

Failure:
#EF4444

Warning:
#F59E0B

Code background:
#F1F5F9

Light mode must remain clean, warm, soft, and low-contrast enough to feel comfortable for long usage.

Do NOT make the light mode pure white everywhere.

Avoid excessive blue backgrounds.

==================================================
17. LIGHT/DARK DESIGN CONSISTENCY
==================================================

Components must maintain the same hierarchy between themes.

For example:

Dark:
Page → #0B0F19
Card → #1E293B
Border → #334155
Text → #F8FAFC

Light:
Page → #F7F7F8
Card → #FFFFFF
Border → #E5E7EB
Text → #171717

The layout should remain identical unless a theme-specific contrast adjustment is necessary.

==================================================
18. AI VISUAL LANGUAGE
==================================================

The application should visually communicate that AI is an important part of the platform.

Use subtle combinations of:

#6366F1
#06B6D4
#14B8A6

for:

AI Analyzer
AI Generator
AI Healer
AI recommendations
Generated test cases
AI processing indicators
AI insights

Use subtle glow effects only for AI-specific elements.

Avoid making every element glow.

==================================================
19. PROCESSING STATE
==================================================

For AI processing:

Use amber:

#F59E0B

Example:

● AI Analyzer Processing...

Add a subtle animated indicator.

For completed AI analysis:

Use:
#10B981

==================================================
20. RESPONSIVENESS
==================================================

Make the dashboard responsive.

Desktop:
- Fixed/collapsible sidebar
- Multi-column KPI cards
- Large dashboard workspace

Tablet:
- Collapsible sidebar
- Responsive cards

Mobile:
- Sidebar becomes drawer
- KPI cards stack
- Tables become scrollable
- Code editor remains horizontally scrollable

Do not break existing functionality.

==================================================
21. UX PRINCIPLES
==================================================

Prioritize:

1. Readability
2. Information hierarchy
3. Technical precision
4. AI visibility
5. Accessibility
6. Consistency
7. Minimal visual noise

Avoid:
- Excessive gradients
- Excessive glassmorphism
- Excessive rounded cards
- Too many colors
- Huge headings
- Excessive animations
- Neon-heavy cyberpunk styling
- Low-contrast text

The result should look like a serious enterprise AI QA engineering product, not a gaming/cyberpunk dashboard.

==================================================
22. IMPLEMENTATION REQUIREMENT
==================================================

First inspect the existing application structure and identify:

- Framework
- Styling system
- Global CSS
- Theme implementation
- Existing layout components
- Existing dashboard components
- Existing design tokens

Then implement the theme using the project's existing architecture.

Prefer reusable design tokens/CSS variables.

Example conceptual tokens:

--color-bg
--color-surface
--color-surface-elevated
--color-border
--color-text-primary
--color-text-secondary
--color-accent
--color-ai
--color-success
--color-error
--color-warning
--color-code-bg

Create separate dark and light token values.

Do not duplicate styling unnecessarily.

==================================================
23. FINAL VISUAL TARGET
==================================================

The final UI should resemble a premium:

"AI QA Engineering Copilot"

with:

- Dark navy enterprise dashboard
- Indigo primary accent
- Cyan AI accent
- Green/red/amber semantic statuses
- Technical code editor
- Clean sidebar
- Modern KPI cards
- AI requirement analysis
- Test case generation
- Automation health
- Execution summary
- Theme toggle
- Professional typography
- Subtle animations
- Strong visual hierarchy

The visual reference is the previously provided QA Copilot dashboard image.

Match its overall visual language, spacing, density, color balance, card styling, sidebar treatment, KPI design, AI analysis section, status badges, and automation/code section.

Do NOT copy branding, text, or proprietary assets from the reference. Recreate the design language using the application's own content and components.