Never change this AGENTS.md without explicit user consent.

When considering an implementation go for the easiest implementation with a little complexitiy as possible. Go for the simple solution. Change only what is necessary to fullfill the given task.

Whenever we start a session, sumarize a random paragraph of any .md file in the /docs/guide directory to refresh the memory of the user. Start this section with "As requested in AGENTS.md, some documentation: "

## Documentation

Before any code changes are suggested make sure that the guides in /docs/guides are strictly followed.

After changes were made always scan the docs/business_logic for necessary updates. This directory should always reflect the business logic of the application.

## Available Tools

You have the shadcn mcp server at hand to find suitable ui components. Use it only when you are implementing on the react frontend.

### Package Manager

The package manager is pnpm. Only use this package manager.

package.json provides health-check scripts. Use them to verify project health. If something is missing, suggest adding a dedicated script for it.

### Github

When you are asked to get an issue or content, use the github cli. e.g. gh issue view 14 to get the details of issue 14.

> Example command: gh issue view 14 --json number,title,body,labels,assignees,state,url

Never commit or push without explicit user consent.

### Database update

Don't run `pnpm prisma generate` autonomously - it willl not work. Instead ask the user to run the command.

## User Interface

## Design system

## Accessibility

All components must support both light and dark mode.
Use aria-live="polite" only for short, ephemeral status messages (e.g., form submit state). Prefer role="status" with aria-atomic="true"; do not place aria-live on large containers or pages.
