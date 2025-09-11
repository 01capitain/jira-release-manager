# Loading States

Consistent loading and success states improve clarity and UX quality. The releases page implements a pattern that you can reuse elsewhere.

Key files:

- `src/app/versions/releases/components/add-release-card.tsx` – phase machine (`idle | loading | success`) and visual states.
- `src/components/ui/glowing-effect.tsx` – subtle glow (neutral while loading, green on success).
- `src/styles/globals.css` – animated dots for the "Thinking..." wording.

## Pattern

1) Drive UI with a narrow phase type:

```ts
type Phase = "idle" | "loading" | "success";
```

2) While `loading`:

- Disable controls.
- Show a neutral overlay (gray) with the text `Thinking...` and animated dots.
- Apply a neutral `GlowingEffect` ring to the container.

3) On `success`:

- Briefly flash a green success state (ring/background), then transition to the final UI (e.g., move or replace the element).

## Make loading intentionally slow in development

Use an environment-aware delay so developers see the state without slowing production. Also, respect `prefers-reduced-motion` by disabling non-essential animations when set.


This pattern is used in the create release form. For animations (like FLIP), we also slow the transition duration in dev so the move is easy to evaluate.

## FLIP motion (optional)

`useFlip(id)` in `src/components/animation/use-flip.ts` animates an element between layouts by measuring the previous and next bounding boxes and playing the inverse transform. We set the transition to `5s` in development and `600ms` otherwise.

