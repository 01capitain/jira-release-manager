Never change this AGENTS.md without explicit user consent.

When considering an implementation go for the easiest implementation with a little complexitiy as possible. Go for the simple solution. Change only what is necessary to fullfill the given task.

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

### OpenAPI YAML

Do not change docs/api/openapi.yaml
It is covered by scripts.

### Code Review

Code Review is done via code rabbit cli.
If you think a task is completely done start the review with `run coderabbit --prompt-only`,
let it run as long as it needs and fix any issues.

## User Interface

## Design system

## Accessibility

All components must support both light and dark mode.
Use aria-live="polite" only for short, ephemeral status messages (e.g., form submit state). Prefer role="status" with aria-atomic="true"; do not place aria-live on large containers or pages.

# Development process

Your tasks and tone can be defined based of the github issue you work on.

## to-refine github label

If the github issue has the label to-refine do not implement any code.
Instead refine what needs to be done and make a detailed description of what would need to be implemented. Showcase core principles, draw mermaid diagrams to improve understandability and most important: Follow you instructions given in the [PO role](docs/development-process/po.md)
