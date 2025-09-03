# Disallow Boolean Fields Linter

This script is a custom linter to enforce the convention of not using `Boolean` types in the `prisma/schema.prisma` file.

## Purpose

In our database schema, we want to avoid using boolean flags. Instead, we prefer to use more descriptive data types like timestamps or status enums. This script helps to automatically enforce this convention.

## Usage

You can run the linter with the following command:

```sh
pnpm lint:db-schema
```

This will check the `prisma/schema.prisma` file for any `Boolean` fields and report an error if any are found.

## Ignoring a Line

If you have a legitimate reason to use a `Boolean` field, you can ignore the linter for a specific line by adding the following comment on the line directly above the field:

```prisma
// prisma-lint-ignore-next-line
isSpecialCase Boolean
```

## Alternatives to Booleans

If you have defined a field as a boolean and are not sure what to use instead, here are some common alternatives:

*   **Timestamps**: Instead of a flag like `is_deleted`, use a `deleted_at` timestamp. A `null` value means the record is not deleted, and a timestamp value indicates when it was deleted.
*   **Status Enums**: Instead of a flag like `is_active`, use a `status` field with an enum that can have values like `ACTIVE`, `INACTIVE`, `ARCHIVED`, etc. This provides more context and allows for more states in the future.

## Temporary Solution

This script is a temporary solution until the `disallow-scalar-type` rule is added to the `prisma-lint` package and the pull request for issue [#3](https://github.com/01capitain/jira-release-manager/issues/3) is merged. Once the rule is available in `prisma-lint`, this script should be removed and replaced by the official linter.
