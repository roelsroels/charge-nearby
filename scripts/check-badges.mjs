import { access, readFile } from "node:fs/promises";
import path from "node:path";

const repositoryRoot = path.resolve(import.meta.dirname, "..");
const readme = await readFile(path.join(repositoryRoot, "README.md"), "utf8");
const badges = [...readme.matchAll(/\[!\[([^\]]+)]\(([^)]+)\)]\(([^)]+)\)/g)].map(
  ([, label, imageUrl, target]) => ({ label, imageUrl, target }),
);

if (badges.length === 0) {
  throw new Error("README.md does not contain any linked badges");
}

const approvedBadgeImages = new Map([
  ["Validate site", "https://github.com/roelsroels/charge-nearby/actions/workflows/validate.yml/badge.svg"],
  ["Latest release", "https://img.shields.io/badge/release-v1.3.1-blue.svg"],
  ["License: MIT", "https://img.shields.io/badge/license-MIT-blue.svg"],
  ["Node.js", "https://img.shields.io/badge/Node.js-%3E%3D22-339933?logo=nodedotjs&logoColor=white"],
  ["Live site", "https://img.shields.io/website?url=https%3A%2F%2Fcharge.roels.com&up_message=online&down_message=offline&label=live%20site"],
  ["Docker Compose", "https://img.shields.io/badge/Docker%20Compose-supported-2496ED?logo=docker&logoColor=white"],
  ["Runtime dependencies: 0", "https://img.shields.io/badge/runtime%20dependencies-0-brightgreen"],
  ["Coverage ≥85% lines", "https://github.com/roelsroels/charge-nearby/actions/workflows/coverage.yml/badge.svg"],
  ["CodeQL security", "https://github.com/roelsroels/charge-nearby/actions/workflows/codeql.yml/badge.svg"],
  ["Deployment security", "https://github.com/roelsroels/charge-nearby/actions/workflows/deployment-security.yml/badge.svg"],
  ["Container security", "https://github.com/roelsroels/charge-nearby/actions/workflows/container-security.yml/badge.svg"],
  ["OpenSSF Scorecard", "https://api.scorecard.dev/projects/github.com/roelsroels/charge-nearby/badge"],
  ["Security policy", "https://img.shields.io/badge/security-policy-blue.svg"],
]);
for (const label of approvedBadgeImages.keys()) {
  if (!badges.some((badge) => badge.label === label)) {
    throw new Error(`README.md is missing the required ${label} badge`);
  }
}

for (const badge of badges) {
  const approvedImageUrl = approvedBadgeImages.get(badge.label);
  if (!approvedImageUrl || badge.imageUrl !== approvedImageUrl) {
    throw new Error(`${badge.label} badge does not use its approved image URL`);
  }

  if (/^https:\/\//.test(badge.target)) {
    new URL(badge.target);
  } else {
    await access(path.resolve(repositoryRoot, badge.target));
  }

  const response = await fetch(approvedImageUrl, {
    headers: { "User-Agent": "charge-nearby-badge-check" },
    signal: AbortSignal.timeout(15_000),
  });

  if (!response.ok) {
    throw new Error(`${badge.label} badge returned HTTP ${response.status}`);
  }

  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("image/")) {
    throw new Error(`${badge.label} badge returned ${contentType || "an unknown content type"}`);
  }

  const image = await response.text();
  if (/>(invalid|unknown|not found)<|no status/i.test(image)) {
    throw new Error(`${badge.label} badge reports an invalid or unknown value`);
  }

  console.log(`✓ ${badge.label}`);
}

const packageMetadata = JSON.parse(
  await readFile(path.join(repositoryRoot, "package.json"), "utf8"),
);
const runtimeDependencyCount = Object.keys(packageMetadata.dependencies ?? {}).length;
if (runtimeDependencyCount !== 0) {
  throw new Error(
    `Runtime dependencies badge reports 0, but package.json declares ${runtimeDependencyCount}`,
  );
}

const expectedReleaseTag = `v${packageMetadata.version}`;
const releaseBadgeUrl = approvedBadgeImages.get("Latest release");
if (!releaseBadgeUrl.includes(`release-${expectedReleaseTag}-`)) {
  throw new Error(`Latest release badge does not match ${expectedReleaseTag} from package.json`);
}

const latestReleaseResponse = await fetch(
  "https://api.github.com/repos/roelsroels/charge-nearby/releases/latest",
  {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "charge-nearby-badge-check",
    },
    signal: AbortSignal.timeout(15_000),
  },
);
if (!latestReleaseResponse.ok) {
  throw new Error(`GitHub latest release lookup returned HTTP ${latestReleaseResponse.status}`);
}
const latestRelease = await latestReleaseResponse.json();
if (latestRelease.tag_name !== expectedReleaseTag) {
  throw new Error(
    `GitHub latest release is ${latestRelease.tag_name}, expected ${expectedReleaseTag}`,
  );
}
