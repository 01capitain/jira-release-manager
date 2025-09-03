We are introducing Code Rabbit to Github.
The goal is to review the code changes in the repository.
On the one hand this will increase the quality of the code base, on the other hand it will showcase whether CodeRabbit might be suitable for a broader use within a corporate environment.!

## Features

![[Code Rabbit - pricing.png]]

The free tier allows to summarize PR summaries and gives a Review in the IDE. I installed the VSCode extension to have it available.

We connected the github repository to have it in action.

## Github Badge

To add a badge to make available how many reviews have been made I copied the following code into the README.MD.

> ![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/01capitain/jira-release-manager?utm_source=oss&utm_medium=github&utm_campaign=01capitain%2Fjira-release-manager&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)

## Interactions

There are 3 ways to chat with CodeRabbit:

- Review comments: Directly reply to a review comment made by CodeRabbit. Example:
  -- I pushed a fix in commit <commit_id>, please review it.
  -- Open a follow-up GitHub issue for this discussion.
- Files and specific lines of code (under the "Files changed" tab): Tag @coderabbitai in a new review comment at the desired location with your query.
- PR comments: Tag @coderabbitai in a new PR comment to ask questions about the PR branch. For the best results, please provide a very specific query, as very limited context is provided in this mode. Examples:
  -- @coderabbitai gather interesting stats about this repository and render them as a table. Additionally, render a pie chart showing the language distribution in the codebase.
  -- @coderabbitai read the files in the src/scheduler package and generate a class diagram using mermaid and a README in the markdown format.
