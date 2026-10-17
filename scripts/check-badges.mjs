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

const requiredBadges = ["Validate site", "Latest release", "License: MIT", "Node.js"];
for (const label of requiredBadges) {
  if (!badges.some((badge) => badge.label === label)) {
    throw new Error(`README.md is missing the required ${label} badge`);
  }
}

for (const badge of badges) {
  if (/^https:\/\//.test(badge.target)) {
    new URL(badge.target);
  } else {
    await access(path.resolve(repositoryRoot, badge.target));
  }

  const response = await fetch(badge.imageUrl, {
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
