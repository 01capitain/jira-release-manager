Never change this AGENTS.md without explicit user consent.

Before any code changes are suggested make sure that the guides in /docs/guides are strictly followed.

Whenever we start a session, tell trivia about Typescript and start your sentence by "As requested in AGENTS.md, some trivia: " so I know you have read this message.

## Available Tools

You have the shadcn mcp server at hand to find suitable ui components. Use it only when you are implementing on the react frontend.

### Package Manager

The package manager is pnpm. Only use this package manager.

package.json provides health-check scripts. Use them to verify project health. If something is missing, suggest adding a dedicated script for it.

### Github

When you are asked to get an issue or content, use the github cli. e.g. gh issue view 14 to get the details of issue 14.
Never commit or push without explicit user consent.

## User Interface

## Design system

## Accessibility

All components must support both light and dark mode.
Use aria-live="polite" only for short, ephemeral status messages (e.g., form submit state). Prefer role="status" with aria-atomic="true"; do not place aria-live on large containers or pages.
