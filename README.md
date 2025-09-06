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

Run tests with `pnpm test`.

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

## Scripts

This project includes a set of scripts to help with development and maintenance.

| Command | Description |
| --- | --- |
| `pnpm build` | Builds the Next.js application for production. The output is stored in the `.next` folder. |
| `pnpm check` | Runs all checks, including linting, database schema linting, and type checking. This is a good command to run before committing your code. |
| `pnpm db:generate` | Generates a new database migration based on the Prisma schema. This is useful when you have made changes to the `schema.prisma` file. |
| `pnpm db:migrate` | Applies all pending database migrations. This is useful when you have pulled changes from a remote repository that include new migrations. |
| `pnpm db:push` | Pushes the Prisma schema to the database without generating a migration. This is useful for small changes to the schema that do not require a migration. |
| `pnpm db:studio` | Opens the Prisma Studio to view and edit data in the database. This is a useful tool for debugging and testing. |
| `pnpm dev` | Starts the Next.js development server with Turbopack. This is the command you will use most often during development. |
| `pnpm format:check` | Checks the formatting of all specified files. This is useful for checking that your code is formatted correctly before committing. |
| `pnpm format:write` | Formats all specified files. This is useful for formatting your code automatically. |
| `pnpm postinstall` | Generates the Prisma Client after installing dependencies. This is run automatically after you run `pnpm install`. |
| `pnpm lint` | Lints the codebase using Next.js's ESLint configuration. This is useful for finding and fixing errors in your code. |
| `pnpm lint:fix` | Lints and fixes all auto-fixable issues. This is useful for fixing a large number of linting errors automatically. |
| `pnpm lint:db-schema` | Lints the database schema to disallow boolean fields. This is a custom script that enforces a project-specific convention. |
| `pnpm preview` | Builds and starts the Next.js application in production mode. This is useful for testing the production build on your local machine. |
| `pnpm start` | Starts the Next.js application in production mode. This is the command you will use to run the application in production. |
| `pnpm typecheck` | Checks the TypeScript types without emitting any files. This is useful for checking that your code is type-safe. |
| `pnpm test` | Runs all tests using Jest. This is useful for ensuring that your code is working correctly. |
| `pnpm test:db-schema` | Tests the database schema linting script. This is useful for ensuring that the custom linting script is working correctly. |
