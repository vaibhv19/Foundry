# UI_Design.md — Foundry Visual Design System

This document specifies the official visual design system, typography, color palette, and interface components for **Foundry**. 

---

## 1. Design Philosophy: "The Strategy Room & Forge"

Foundry’s visual identity is built around the industrial metaphor of a **Foundry** (heating, debate, forging, and casting raw ideas into a structured blueprint). It intentionally moves away from generic SaaS "dark navy/cyan" tech templates and "chatbot bubbles," favoring a focused, high-end strategy chamber aesthetic.

### Core Principles
- **Atmospheric & Executive**: Employs deep forest greens and warm gold accents to feel like an exclusive strategy chamber rather than a standard developer terminal.
- **Cognitive Hierarchy**: Distinguishes structural containers (cards) from metadata (status pills, inputs) to ensure content stands out cleanly without boxy visual fatigue.
- **State Transparency**: Real-time progress is communicated through active status highlights (glowing node states) rather than generic spinning loaders.

---

## 2. Typography

The type system is clean, intentional, and restricted to two complementary families to avoid visual clutter:

| Level | Family | Treatment | Use Case |
| :--- | :--- | :--- | :--- |
| **Display Heading** | `'Lora', serif` | Semibold, Letter-spacing: `-0.01em` to `-0.025em` | Major page titles, authentication headings ("Sign in to Foundry"), and section headings ("Your Startup Blueprints"). |
| **Form Label** | `'Plus Jakarta Sans', sans-serif` | Weight: `600`, `font-size: 0.8rem`, Letter-spacing: `0.02em` | Input field labels (all uppercase) to maximize scannability. |
| **Body & UI Controls** | `'Plus Jakarta Sans', sans-serif` | Weight: `400` / `500`, Line-height: `1.4` to `1.5` | Form inputs, buttons, status badges, log records, and general description copy. |

> [!IMPORTANT]
> **Serif Restriction Rule**: The Serif display treatment (`Lora`) is strictly reserved for major display headings and page titles. All metadata, form controls, card body texts, and terminal/system logs MUST use the sans-serif font (`Plus Jakarta Sans`).

---

## 3. Color Palette

The color scheme is designed for comfort during long sessions, using low-contrast dark bases and high-priority gold Highlights.

### 3.1 Core Colors
- **Outer Canvas Background**: `#05080A` (Forest Black)
- **Inner Canvas Glow**: `#0B1C1A` (Deep Emerald / Teal)
- **Card Background**: `rgba(13, 20, 24, 0.82)`
- **Card Border**: `rgba(197, 168, 128, 0.1)` (10% Gold opacity)
- **Primary Accent (Gold)**: `#C5A880`
- **Primary Accent Hover**: `#D5BC98`
- **Spark Secondary Accent (Active/Error/CTA)**: `#C94A4A` (Muted Crimson) / `#F87171` (Hover Red)
- **Primary Text**: `#E2E8F0`
- **Muted Text**: `#8A99AD`

### 3.2 Status Badge Fills (No Borders)
Status tags are styled as borderless metadata pills to prevent them from looking like clickable boxes:
- **`READY` Status**: Background `rgba(30, 94, 78, 0.25)`, Text Color `#3CD070`
- **`QUEUED` / `GENERATING` Status**: Background `rgba(197, 168, 128, 0.15)`, Text Color `#C5A880`

---

## 4. Component Patterns & Weights

To prevent visual monotony, components are grouped into three distinct priority levels based on border and background weights:

```mermaid
graph TD
    classDef card fill:rgba(13,20,24,0.8),stroke:#C5A880,stroke-width:2px;
    classDef input fill:none,stroke:#fff,stroke-opacity:0.2,stroke-width:1px;
    classDef badge fill:#C5A880,stroke:none;

    C1[Content Cards<br>Forge Card / Blueprint Cards] :::card
    I1[Inputs / Control UI<br>Textareas / Search Bar] :::input
    B1[Metadata Badges<br>READY / QUEUED Pills] :::badge
```

### 4.1 Cards (Primary Grouping)
- **Visual Weight**: Thick border (`1px solid rgba(197, 168, 128, 0.08)`), dark semi-transparent fill (`rgba(13, 20, 24, 0.65)`), and blur backdrop-filter (`12px`).
- **Use Case**: Used strictly for major content boundaries like the idea generator block and blueprint cards.

### 4.2 Inputs & Secondary Controls (Medium Weight)
- **Visual Weight**: Borderless, using a thin bottom line (`1px solid rgba(255, 255, 255, 0.1)`) and a flat dark background (`rgba(0, 0, 0, 0.25)`) or transparent base. Focus is indicated by a gold bottom underline.
- **Use Case**: Textareas, search inputs, and sidebar form controls.

### 4.3 CTAs & Badges (Lightweight Highlights)
- **Visual Weight**: Solid color fills. Primary buttons use a pill-shaped outline (`borderRadius: '24px'`) to distinguish them from rectangular cards. Status tags are borderless filled pills (`borderRadius: '12px'`).
- **Use Case**: Action triggers and metadata flags.

---

## 5. Icon & Brand Identity

### The Triple-Glow Monolith
To avoid confusion with interactive UI actions (such as chevrons, arrows, or collapse toggles), the brand mark is a dedicated product logo:
- **Structure**: Three clean, intersecting diagonal and vertical gold bars representing the three expert agent personas (Investor, PM, Tech Lead). They converge at the top beneath a sharp, glowing diamond crown.
- **Styling**: Rendered in a gold gradient (`#E2C9A1` to `#C5A880`) and presented borderless inside a dark circular button badge (`backgroundColor: '#070B0D'`).

---

## 6. Key Screens

### 6.1 Authentication (Sign In & Register)
- **Layout**: Centered card (`maxWidth: '400px'`, `padding: '2.5rem 2.25rem'`) with a clean `fadeIn` slide entry animation.
- **Branding**: Displays the Triple-Glow Monolith prominently above the serif header.

### 6.2 Main Dashboard
- **Forge Panel**: Single primary card containing the idea submission textarea (styled with a bottom border and dark background shade) and the pill-shaped "+ Forge Blueprint" CTA button.
- **Blueprints Grid**: Responsive grid of cards showing file icons, creation dates, status pills, and rust-colored trash icons.
- **Empty State**: Borderless, transparent centered graphic showing the faded brand monolith and a call-to-action to submit an idea.

### 6.3 Strategy Room (Editor)
- **Top Bar**: Gold title text in Lora, custom filled status badges, and a Gold-filled convergence progress bar.
- **Left Rail (Timeline)**: Vertical dashed track displaying active agent node status. 
  - *Idle nodes*: DImmed, grey outline, grey icon (`#475569`).
  - *Thinking nodes*: Active gold highlight ring and gold fill.
  - *Done nodes*: Green outline and green text indicating completed reasoning.
- **Right Rail (Decision Log)**: Displays chronological decision logs styled in dark glassy cards with gold text parameters.

---

## 7. Open Design Questions

> [!WARNING]
> **Active Question: Job ID & Operational Metadata Visibility**
> There is an active debate on whether low-level debug information (such as the specific Job UUID and exact worker state) should remain visible to end users at all in the Strategy Room Left Rail. 
> - **Option A**: Remove it completely from the user-facing workspace, routing it strictly to browser developer logs or backend telemetry.
> - **Option B**: Keep it visible as an intentional, styled status footer to maintain engineering transparency for technical users (currently implemented using the Strategy Room's font and muted colors).