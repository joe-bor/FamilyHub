# FamilyHub Design System

## Family Member Colors (oklch)

| Color   | Value                    | Assigned To    | Tailwind Class   |
|---------|--------------------------|----------------|------------------|
| coral   | oklch(0.72 0.15 25)      | Mom            | `bg-coral`       |
| teal    | oklch(0.65 0.12 195)     | Dad            | `bg-teal`        |
| green   | oklch(0.7 0.14 145)      | Ethan          | `bg-green`       |
| purple  | oklch(0.6 0.18 285)      | Primary accent | `bg-purple`      |
| yellow  | oklch(0.85 0.15 90)      | Grandma        | `bg-yellow`      |
| pink    | oklch(0.75 0.12 350)     | Grandpa        | `bg-pink`        |
| orange  | oklch(0.75 0.15 50)      | Family shared  | `bg-orange`      |

## Typography

- **Font**: Nunito (Google Fonts)
- **Weights**: 400 (normal), 500 (medium), 600 (semibold), 700 (bold), 800 (extrabold)
- **Fallback**: sans-serif

## Border Radius

| Size | Value              | Class          |
|------|-------------------|----------------|
| sm   | calc(0.75rem - 4px) | `rounded-sm`   |
| md   | calc(0.75rem - 2px) | `rounded-md`   |
| lg   | 0.75rem           | `rounded-lg`   |
| xl   | calc(0.75rem + 4px) | `rounded-xl`   |

## Base Colors

| Token      | Value                      | Usage              |
|------------|----------------------------|--------------------|
| background | oklch(0.98 0.01 85)        | Page background    |
| foreground | oklch(0.25 0.02 250)       | Text               |
| primary    | oklch(0.55 0.18 285)       | Buttons, links     |
| secondary  | oklch(0.96 0.015 85)       | Secondary actions  |
| muted      | oklch(0.94 0.02 85)        | Disabled states    |
| border     | oklch(0.88 0.02 85)        | Borders            |
| destructive| oklch(0.65 0.2 25)         | Delete, errors     |

## Quick Reference

```css
/* Use CSS variables in Tailwind */
bg-coral        /* Family member color */
text-foreground /* Main text */
bg-primary      /* Primary buttons */
bg-secondary    /* Secondary actions */
border-border   /* Standard borders */
```
