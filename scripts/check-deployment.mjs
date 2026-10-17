const deploymentUrl = "https://charge.roels.com/";
const response = await fetch(deploymentUrl, {
  headers: { "User-Agent": "charge-nearby-deployment-check" },
  redirect: "error",
  signal: AbortSignal.timeout(15_000),
});

if (response.status !== 200) {
  throw new Error(`Deployment returned HTTP ${response.status}`);
}

const requiredHeaders = new Map([
  ["strict-transport-security", /(?:^|;)\s*max-age=\d+/i],
  ["content-security-policy", /default-src\s+'self'/i],
  ["x-frame-options", /^DENY$/i],
  ["x-content-type-options", /^nosniff$/i],
  ["referrer-policy", /^strict-origin-when-cross-origin$/i],
  ["permissions-policy", /camera=\(\).*microphone=\(\)/i],
  ["cross-origin-embedder-policy", /^credentialless$/i],
  ["cross-origin-opener-policy", /^same-origin$/i],
  ["cross-origin-resource-policy", /^same-origin$/i],
]);

for (const [name, expected] of requiredHeaders) {
  const value = response.headers.get(name) ?? "";
  if (!expected.test(value)) {
    throw new Error(`${name} is missing or invalid`);
  }
  console.log(`✓ ${name}`);
}

const contentSecurityPolicy = response.headers.get("content-security-policy") ?? "";
for (const directive of ["base-uri 'self'", "frame-ancestors 'none'", "object-src 'none'"]) {
  if (!contentSecurityPolicy.includes(directive)) {
    throw new Error(`Content-Security-Policy is missing ${directive}`);
  }
}

console.log(`✓ ${deploymentUrl} is online with the required security headers`);
