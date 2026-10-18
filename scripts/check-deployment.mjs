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
  ["content-security-policy", /default-src\s+'none'/i],
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
for (const directive of [
  "base-uri 'none'",
  "connect-src 'self' https://api.pdok.nl",
  "frame-ancestors 'none'",
  "frame-src 'none'",
  "img-src 'self' data: https://tile.openstreetmap.org",
  "media-src 'none'",
  "object-src 'none'",
  "script-src 'self'",
  "script-src-attr 'none'",
  "worker-src 'none'",
]) {
  if (!contentSecurityPolicy.includes(directive)) {
    throw new Error(`Content-Security-Policy is missing ${directive}`);
  }
}

const securityTxtUrl = new URL(".well-known/security.txt", deploymentUrl);
const securityTxtResponse = await fetch(securityTxtUrl, {
  headers: { "User-Agent": "charge-nearby-deployment-check" },
  redirect: "error",
  signal: AbortSignal.timeout(15_000),
});

if (securityTxtResponse.status !== 200) {
  throw new Error(`security.txt returned HTTP ${securityTxtResponse.status}`);
}
if (!/^text\/plain(?:;|$)/i.test(securityTxtResponse.headers.get("content-type") ?? "")) {
  throw new Error("security.txt is not served as text/plain");
}

const securityTxt = await securityTxtResponse.text();
if (!/^Contact:\s+\S+/im.test(securityTxt)) {
  throw new Error("security.txt is missing Contact");
}

const expires = securityTxt.match(/^Expires:\s+(.+)$/im)?.[1]?.trim();
if (!expires || !Number.isFinite(Date.parse(expires)) || Date.parse(expires) <= Date.now()) {
  throw new Error("security.txt Expires is missing, invalid, or not in the future");
}

const canonical = securityTxt.match(/^Canonical:\s+(.+)$/im)?.[1]?.trim();
if (canonical !== securityTxtUrl.href) {
  throw new Error(`security.txt Canonical must be ${securityTxtUrl.href}`);
}

console.log("✓ security.txt");
console.log(`✓ ${deploymentUrl} is online with the required security controls`);
