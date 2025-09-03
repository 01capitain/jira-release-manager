We are introducing Code Rabbit to Github.
The goal is to review the code changes in the repository.
On the one hand this will increase the quality of the code base, on the other hand it will showcase whether CodeRabbit might be suitable for a broader use within a corporate environment.

# Pro licence evaluation

As I activated CodeRabbit, I got 14 days of trial of the pro version that is usually priced at 24$/month/developer.
For the features see the general Code Rabbit document.
The test time goes from September 3rd (today) until september 17th and these are my findings:

## [Dashboard](https://app.coderabbit.ai/dashboard)

To be used.

## First Pull request

As soon as the pull request was set as ready, code rabbit started to review it and leave their remarks:
[Pull Request #5](https://github.com/01capitain/jira-release-manager/pull/5)

### Walthrough

The walkthrough was added as a comment right after the pull request was marked as ready (about 10 minutes after). It contains of several features

#### Changes

Lists the changed files and summarizes the change within the file.
Helpful, 3/5 Stars

#### Sequence diagrams

It provided sequence diagrams that showcased the newly introduced commands pnpm lint:db-schema and pnpm test:db-schema as mermaid diagrams.
I think it went a little too verbose on them but they are factical correct.
It provides the option to copy the mermaid code so that you can insert it into a readme file to store it. Otherwise it is scoped to the pull request only.

Super nice and we would not create such diagrams otherwise: 5/5 stars

```
sequenceDiagram
  autonumber
  actor Dev as Developer
  participant NPM as npm / pnpm
  participant Lint as disallow-boolean-fields.mjs
  participant FS as File System

  Dev->>NPM: pnpm lint:db-schema [-- <schemaPath>]
  NPM->>Lint: node scripts/disallow-boolean-fields.mjs <schemaPath?>
  Lint->>FS: Read schema (default prisma/schema.prisma)
  FS-->>Lint: File contents or error
  alt Read error
    Lint-->>Dev: stderr: read error
    Lint->>Dev: exit 1
  else Read ok
    Lint->>Lint: Scan lines, respect // prisma-lint-ignore-next-line
    alt Boolean found (non-ignored)
      Lint-->>Dev: stderr: line report(s)
      Lint->>Dev: exit 1
    else No booleans found
      Lint-->>Dev: stdout: success message
      Lint->>Dev: exit 0
    end
  end
```

#### Estimated code review effort

Shows a one liner how long a manual code review is supposed to take:
🎯 3 (Moderate) | ⏱️ ~25 minutes

Nice to have: 2/5 stars. Useful mainly for the developer to know how much time to block. However, super dependent on how we do code reviews.

#### Assessment on linked issues

Shows a table of issues that were mentioned and checks whether the Objective of the issue was met.

Great to have 4/5 stars.
It works especially good as the issues are also in github.
When we handle the issues in jira it needs to be evaluated whether this still works. A Jira (& Linear) integration is part of the Pro tier

#### Assessment of out of scope changes

Lists code changes that are unrelated to the feature mentioned in the issues.

4/5, very helpful to get unreleated changes - would not be covred in our code review process currently.

#### Poem

A "funny" poem about the merge request.
Nice to Have, skippable: 1/5

```
I nibble lines and sniff for Bool,
Hopping through schema, quick and cool.
Enums and timestamps guide my track,
Tests pass, I stash the carrot back. 🥕🐇
```

### Recent review details

Lists information on how Code Rabbit was run, Review profile is CHILL, Plan is Pro and the knowledge base confioguration (which is none).
MCP integration is disabled, Jira integration is disabled, Linear integration is disabled.

### Generate unit tests

Offers the option to add unit tests in three different ways:
1.) Cretae PR with unit tests
2.) Post copyable unit tests in a comment
3.) Commit unit tests in branch.

I chose option 1 and will report back on the quality of unit tests. Before running I dont see the necessity for more tests in that particular PR

### Docstring generation

Gets the option to generate docstrings which then take a while. I don't know what this is and will be eager to see ;-)
Update: coderabbitai message: "Caution, No docstrings were generated." Maybe with the next MR.

### Tips

Provided tips for the usage of Code Rabbit. In this case it let me know how to interact with it. the tips were helpful and I copied it to the main Code Rabbit.md in the personal Vault

4/5 stars even so not related to operational merge review process.

### Actionable comments
Makes a list of comments about the changes

#### Outside diff range comments (2)
Found typos in the readme (that was not within the MR) and suggested fixes. Both were applied by C+P into the code.

#### Nitpick comments (12)
Made comments about better formating of the readme (ignored), about splitting test fails (follow up issue created to fix it) to harden the linter rule
Also it pointed out good practices, which I really liked.
Suggested to improve the error message in the tests to show what schema was tested (approved).
- Suggested a -json flag to make the output machine readable (follow up issue created)
- Suggested to add the new commands to the main "check" command - approved
#### Refactor suggestion
Suggested to refactor the regex that are used to identify the findings. Provided a directly commitable change (which i used) or an prompt to use for an AI agent.
When you want to merge the commit directly it warns you that this code is AI generated. Very nice.
5/5 - super helpful and directly actionable.