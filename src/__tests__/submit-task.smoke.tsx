import assert from "node:assert/strict";

import { renderToStaticMarkup } from "react-dom/server";

import { SiteHeader } from "../components/layout/SiteHeader";
import { SubmitTaskPage } from "../components/submit/SubmitTaskPage";
import { SubmissionStatusPage } from "../components/submit/SubmissionStatusPage";
import { copyTextToClipboard } from "../components/shared/CopyableCodeBlock";

const clipboardCalls: string[] = [];

Object.defineProperty(globalThis, "navigator", {
  configurable: true,
  value: {
    clipboard: {
      async writeText(value: string) {
        clipboardCalls.push(value);
      },
    },
  },
});

Object.defineProperty(globalThis, "window", {
  configurable: true,
  value: {
    location: {
      pathname: "/submit-task",
      search: "",
      hash: "",
      hostname: "loopsbench.ai",
    },
    setTimeout,
  },
});

const headerHtml = renderToStaticMarkup(<SiteHeader />);
assert.match(headerHtml, /Submit Task/);
assert.match(headerHtml, /nav-active/);

const pageHtml = renderToStaticMarkup(<SubmitTaskPage />);
assert.match(pageHtml, /Submit a Task/);
assert.match(pageHtml, /Submit a Proposal/);
assert.match(pageHtml, /Read Contribution Guide/);
assert.match(pageHtml, /Contribution Process/);
assert.match(pageHtml, /Review the criteria/);
assert.match(pageHtml, /Pull Request/);
assert.match(pageHtml, /GitHub-native workflow/);
assert.match(pageHtml, /target="_blank"/);
assert.match(pageHtml, /rel="noopener noreferrer"/);
assert.doesNotMatch(pageHtml, /undefined/);
assert.doesNotMatch(pageHtml, /null/);
assert.doesNotMatch(pageHtml, /TODO_URL/);
assert.doesNotMatch(pageHtml, /Discord/i);
assert.doesNotMatch(pageHtml, /type="file"/);
assert.match(pageHtml, /ZIP or finished task bundle/);
assert.match(pageHtml, /Proposal approval means the task idea is worth building/i);

const statusHtml = renderToStaticMarkup(<SubmissionStatusPage />);
assert.match(statusHtml, /Track a Task on GitHub/);
assert.match(statusHtml, /Proposal issue/);
assert.match(statusHtml, /Task pull request/);

await copyTextToClipboard("python3 scripts/validate_task_contribution.py --task-dir tasks/task_my_new_case --static-only");
assert.equal(clipboardCalls.length, 1);
assert.match(clipboardCalls[0], /validate_task_contribution/);

console.log("submit-task smoke test passed");
process.exit(0);
