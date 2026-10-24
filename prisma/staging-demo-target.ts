export type StagingTargetConfig = {
  databaseUrl: string | undefined;
  stagingDatabaseHost: string | undefined;
  productionDatabaseHost: string | undefined;
};

function normalizeConfiguredHost(value: string | undefined, name: string): string {
  const host = value?.trim().toLowerCase().replace(/\.$/, "");
  if (!host || host.includes("://") || host.includes("/") || host.includes(":")) {
    throw new Error(`${name} must be set to a hostname only (no scheme, port, or path).`);
  }
  return host;
}

/**
 * Fail closed unless DATABASE_URL is the exact, direct Neon staging host and
 * is distinct from the configured production host. Never include the URL in
 * an error or log: it contains credentials.
 */
export function validateStagingDemoTarget(config: StagingTargetConfig): string {
  if (!config.databaseUrl) {
    throw new Error("DATABASE_URL is required for the staging demo seed.");
  }

  const stagingHost = normalizeConfiguredHost(config.stagingDatabaseHost, "STAGING_DATABASE_HOST");
  const productionHost = normalizeConfiguredHost(
    config.productionDatabaseHost,
    "PRODUCTION_DATABASE_HOST",
  );

  if (stagingHost === productionHost) {
    throw new Error("The configured staging and production database hosts must be different.");
  }

  let databaseHost: string;
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(config.databaseUrl);
    databaseHost = parsedUrl.hostname.toLowerCase().replace(/\.$/, "");
  } catch {
    throw new Error("DATABASE_URL is not a valid PostgreSQL connection URL.");
  }

  if (parsedUrl.protocol !== "postgres:" && parsedUrl.protocol !== "postgresql:") {
    throw new Error("DATABASE_URL must use the PostgreSQL protocol.");
  }
  if (!databaseHost.endsWith(".neon.tech")) {
    throw new Error("The staging demo seed is restricted to a Neon database host.");
  }
  if (/(^|[.-])pooler([.-]|$)/.test(databaseHost)) {
    throw new Error("Use the direct, unpooled Neon connection URL for the staging seed.");
  }
  if (databaseHost !== stagingHost) {
    throw new Error("DATABASE_URL does not match STAGING_DATABASE_HOST.");
  }
  if (databaseHost === productionHost) {
    throw new Error("Refusing to seed the configured production database host.");
  }

  return databaseHost;
}
