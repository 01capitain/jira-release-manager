# Create T3 App

This is a T3 Stack project bootstrapped with `create-t3-app`.
To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

## Tools

### Code Rabbit

We use the free tier of Code Rabbit to have a first code review on pull requests:

![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/01capitain/jira-release-manager?utm_source=oss&utm_medium=github&utm_campaign=01capitain%2Fjira-release-manager&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## Tech Stack

### Language

[Next.js](https://nextjs.org)

### Styling

[Tailwind CSS](https://tailwindcss.com)

### Database

PostgreSQL 17.5, running in a Docker container.

Set up with `./start-database.sh`.

### ORM

[Prisma](https://prisma.io)

### Linter

Eslint + [Prettier](https://prettier.io/)

### Testing

[Jest](https://jestjs.io/)

Run tests with `npm test`.

### tRPC

[tRPC](https://trpc.io)

No idea yet what category this falls into, I want to experiment with it and find good resources for learning..

### Authorization

[NextAuth.js](https://next-auth.js.org)

#### Discord oAuth

Find how to set up discord OAuth in the [First steps on t3.gg](https://create.t3.gg/en/usage/first-steps). _Caveat:_ The OAuth callback is set up to redirect to localhost:3000
If that port is changed you need to also update the webhook within the [Discord setup](https://discord.com/developers/applications/1411074365621145772/oauth2).

## How do I deploy this?

Follow our deployment guides for [Docker](https://create.t3.gg/en/deployment/docker) for more information.
