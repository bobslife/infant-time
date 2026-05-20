import { readFileSync } from "node:fs";

const expectedUrl = "https://infant-time.vercel.app";

const checks = [
  {
    path: "capacitor.config.ts",
    readUrl() {
      const source = readFileSync(this.path, "utf8");
      return source.includes(`?? "${expectedUrl}"`) || source.includes(`?? '${expectedUrl}'`)
        ? expectedUrl
        : null;
    },
  },
  {
    path: "ios/App/App/capacitor.config.json",
    readUrl() {
      return JSON.parse(readFileSync(this.path, "utf8")).server?.url ?? null;
    },
  },
  {
    path: "android/app/src/main/assets/capacitor.config.json",
    readUrl() {
      return JSON.parse(readFileSync(this.path, "utf8")).server?.url ?? null;
    },
  },
];

const failures = checks.flatMap((check) => {
  try {
    const actualUrl = check.readUrl();
    return actualUrl === expectedUrl
      ? []
      : [`${check.path}: expected ${expectedUrl}, got ${actualUrl ?? "missing"}`];
  } catch (error) {
    return [`${check.path}: ${error instanceof Error ? error.message : String(error)}`];
  }
});

if (failures.length > 0) {
  console.error("Capacitor remote URL check failed:");
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log(`Capacitor remote URL check passed: ${expectedUrl}`);
