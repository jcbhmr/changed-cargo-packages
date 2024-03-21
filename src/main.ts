import { resolve, sep } from "node:path";
import * as core from "@actions/core";
import * as github from "@actions/github";
import { $ } from "execa";
import { PushEvent } from "@octokit/webhooks-types/schema";

const token = core.getInput("token");
const octokit = github.getOctokit(token);

let changedFiles: string[];
if (
  await $`git status`.then(
    () => true,
    () => false,
  )
) {
  const { stdout } = await $`git diff --name-only HEAD^`;
  changedFiles = stdout.split(/\r?\n/g).filter((x) => x);
} else {
  if (github.context.eventName === "push") {
    const payload = github.context.payload as PushEvent;
    changedFiles = payload.commits
      .reduce<string[]>((a, x) => a.concat(x.added, x.modified, x.removed), [])
      .map((x) => resolve(x));
  } else if (github.context.eventName === "pull_request") {
    const { data } = await octokit.rest.pulls.listFiles({
      owner: github.context.repo.owner,
      repo: github.context.repo.repo,
      pull_number: github.context.payload.pull_request!.number,
    });
    changedFiles = data
      .flatMap((x) =>
        x.previous_filename ? [x.previous_filename, x.filename] : x.filename,
      )
      .map((x) => resolve(x));
  } else {
    throw new DOMException(`cannot handle ${github.context.eventName}`);
  }
}

const path = resolve(core.getInput("path"));

// $ cargo tree --workspace --depth 0
// hello1 v0.1.0 (/workspaces/codespaces-blank/crates/hello1)
//
// hello2 v0.1.0 (/workspaces/codespaces-blank/crates/hello2)
const { stdout } = await $({ cwd: path })`cargo tree --workspace --depth 0`;
const packages = stdout.split(/(?:\r?\n){2}/g).map((x) => ({
  name: x.split(" ", 1)[0],
  path: x.match(/\((.+)\)/)![1],
}));

const changedPackages = packages.filter((p) =>
  changedFiles.some((f) => f.startsWith(p.path + sep)),
);
const changedPackageNames = changedPackages.map((x) => x.name);
core.setOutput("changed-packages", JSON.stringify(changedPackageNames));
