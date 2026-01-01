# Decision logic

This document lists actions that need to be taken to achieve a specific action.
They are structured in a WHEN/THEN policy so that it gets clear what is the requirement and what is the resulting action.

-  WHEN I start the deployment of a Built
  -  THEN I check for every Release components whether it has changed issues
  -  THEN I choose the Release components I want to deploy

- WHEN I have deployed all Release components of a Built
  - THEN I set the built in Jira to Released
  - THEN I update the issues where all components were released to Live

-  WHEN I choose to deploy a Release component
  - THEN I name the Jira Release so that new issues do not get merged into it anymore
  - THEN I create a new Jira version with the "Next marker" for the successing built.
  - THEN I set all issues of the Jira Release to "Staged For Release"

-  WHEN I want to deploy a version bound Release component

-  WHEN I want to deploy a global Release component