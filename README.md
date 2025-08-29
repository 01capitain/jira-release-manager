# Create T3 App

This is a T3 Stack project bootstrapped with `create-t3-app`.
To learn more about the [T3 Stack](https://create.t3.gg/), take a look at the following resources:

- [Documentation](https://create.t3.gg/)
- [Learn the T3 Stack](https://create.t3.gg/en/faq#what-learning-resources-are-currently-available) — Check out these awesome tutorials

## Tech Stack

### Language

[Next.js](https://nextjs.org)

### Styling

[Tailwind CSS](https://tailwindcss.com)

### Database

postgres database, running in docker container.

### ORM

[Prisma](https://prisma.io)

### Linter

Eslint + [Prettier](https://prettier.io/)

### tRPC

[tRPC](https://trpc.io)

No idea yet what category this falls into, I want to experiment with it and find good ressources for learning.

### Authorization

[NextAuth.js](https://next-auth.js.org)

#### Discord oAuth

Find how to set up discord OAuth in the [First steps on t3.gg](https://create.t3.gg/en/usage/first-steps). _Caviat:_ The OAuth callback is set up to redirect to localhost:3000
If that port is changed you need to also update the webhook within the [Discord setup](https://discord.com/developers/applications/1411074365621145772/oauth2).

## How do I deploy this?

Follow our deployment guides for [Docker](https://create.t3.gg/en/deployment/docker) for more information.
