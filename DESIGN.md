---
spec-version: "2.0.0-draft"
system-name: "APPLYTRACK Design System"
vibe-mode: "Obsidian Cyber"
platform: "Antigravity 2.0 / Stitch MCP"
architectures:
  - "React"
  - "TailwindCSS"
---

# DESIGN SYSTEM SPECIFICATION (`DESIGN.md`)

## 1. Global Design Tokens

```yaml
tokens:
  meta:
    theme: "Dark Protocol"
    contrast_target: "WCAG AAA"

  colors:
    background:
      canvas: "#030712"        # Deep midnight obsidian background (base layer)
      surface: "#0B111E"       # Elevated container/card surface
      sidebar: "#060A13"       # Distinct structural left panel
      input: "#070D19"         # Dark field background inputs
    brand:
      primary: "#22D3EE"       # Electric Cyan (APPLYTRACK main glow / primary buttons)
      secondary: "#38BDF8"     # Sky Blue (Secondary structural highlights)
      accent: "#6366F1"        # Indigo (System state indicators / dynamic badges)
    status:
      success: "#10B981"       # Emerald Green (Sync Completed / Active state)
      warning: "#F59E0B"       # Amber (Interviews / Assessment updates)
      error: "#EF4444"         # Crimson (Rejections / Connection failures)
      neutral: "#9CA3AF"       # Muted Slate for descriptive copy
    borders:
      subtle: "rgba(34, 211, 238, 0.08)"  # Faint cyber-cyan border tint
      active: "#22D3EE"                   # Focused component/navigation state
      muted: "#1E293B"                    # Dormant card/divider lines

  typography:
    families:
      sans: "'Inter', system-ui, -apple-system, sans-serif"
      mono: "'JetBrains Mono', 'Fira Code', monospace"
    weights:
      normal: 400
      medium: 550
      bold: 700
    scales:
      xs: "12px"
      sm: "14px"
      base: "16px"
      lg: "18px"
      xl: "24px"    # Primary Dashboard headers

  geometry:
    radius:
      cards: "12px"            # Rounded structural dashboard modules
      buttons: "8px"           # Curved interactive button targets
      inputs: "6px"            # Curvature for input/IMAP text areas
    spacing:
      sidebar-width: "260px"
      grid-gap: "20px"
      padding-card: "24px"
      padding-compact: "12px"
```

## 2. Component Layout & Structural Semantic Roles

### 2.1 Layout Architecture
* **Structural Blueprint:** The workspace uses a sticky fixed left-side menu navigation spanning exactly 260px. The remaining window area is a fluid grid main-canvas displaying context-driven views.
* **Sidebar (`#060A13`):** Contains the brand header logo and a top-down list of navigation elements. Active links use a background tint of `rgba(34, 211, 238, 0.1)` paired with an explicit primary color left-edge indicator rule.

### 2.2 Container Cards (`#0B111E`)
* **Elevated Blocks:** Metric widgets and data lists must be wrapped in surfaces distinct from the primary canvas. They require a uniform curvature of 12px and a thin edge border using `borders.subtle`.
* **State Persistence:** Persistent background processes (like the "Sync Completed" status widget) must feature an implicit breathing glow styling layout: 
  ```css
  box-shadow: 0 0 12px rgba(16, 185, 129, 0.15);
  ```

### 2.3 Interactive Forms & Code Blocks
* **Input Elements:** Text fields (such as IMAP settings and configuration blocks) use `colors.background.input`. Borders transition sharply from `borders.muted` to `borders.active` upon focus states.
* **Monospace Views:** Email headers, prompt generation text areas, and setup tables require rendering via `typography.families.mono` at 14px styling rules to guarantee readability.

## 3. Autonomous AI Agent Constraints & Execution Guidelines

> [!IMPORTANT]
> The following rules are binding parameters for the Antigravity Agent Manager. Any generated layouts, code components, or styling refactors must conform strictly to these runtime instructions.

* **Anti-Drift Guardrail:** Under no circumstance should the agent use generic Tailwind or raw CSS layout primitives (e.g., `bg-white`, `text-black`, `bg-blue-500`). All styles must map directly to the defined semantic tokens above.
* **State Invalidation:** When the agent auto-generates alternative micro-views (like an automated email composer or an explicit Kanban step column), it must preserve the dark aspect consistency using the `#030712` base layout rules.
* **Component Instantiation:** When writing new React components, use Tailwind utilities matching these token maps:
  * Container Background: `bg-[#0B111E]`
  * Border Accent: `border-[rgba(34, 211, 238, 0.08)]`
  * Text Heading: `text-[#22D3EE]`

## 4. Accessibility & Automated Validation Guidelines

* **Linter Invocations:** Before proposing code diffs to the terminal output, the internal agent tool should pass code iterations through a design checker to verify that text strings on background cards respect a contrast score of WCAG AAA.
* **Semantic Code Elements:** Text blocks mapping to status states (such as application acceptance metrics or error states) must accompany their color-coded layouts with readable descriptive context tags for screen readers.