#!/usr/bin/env node
/**
 * Build a valid container image reference for the publish workflow.
 *
 * GitHub derives `GITHUB_REPOSITORY` from the repository slug, and a slug is not
 * necessarily a valid image path: this repository is `Teamthy/ykay_eduport-`,
 * whose trailing hyphen makes `ghcr.io/teamthy/ykay_eduport-:main` an invalid
 * reference (`docker/build-push-action` rejects it with "invalid reference
 * format"). Every publish from main failed that way from the start, so the image
 * it claimed to publish never existed.
 *
 * Docker's grammar, per distribution/reference:
 *   path component : [a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*
 *   tag            : [A-Za-z0-9_][A-Za-z0-9._-]{0,127}
 *
 * Usage: node scripts/docker-image-ref.mjs <registry> <owner/repo> <tag>
 * Prints the reference on stdout; exits non-zero with an `::error::` line when
 * the inputs cannot be normalised into something valid.
 */
const COMPONENT = /^[a-z0-9]+(?:(?:[._]|__|-+)[a-z0-9]+)*$/;
const TAG = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;
const MAX_NAME = 255;

/** Collapse a path component into something Docker accepts. */
export function normaliseComponent(raw) {
  return String(raw)
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/[-._]{2,}/g, "-")
    .replace(/^[^a-z0-9]+/, "")
    .replace(/[^a-z0-9]+$/, "");
}

/** Collapse a tag into something Docker accepts. Case is preserved. */
export function normaliseTag(raw) {
  return String(raw)
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^[^A-Za-z0-9_]+/, "")
    .slice(0, 128);
}

export function imageReference(registry, repository, tag) {
  const host = String(registry ?? "")
    .trim()
    .toLowerCase();
  if (!host || /[\s/]/.test(host)) {
    throw new Error(`registry "${registry}" is not a host name`);
  }

  const components = String(repository ?? "")
    .split("/")
    .map(normaliseComponent)
    .filter(Boolean);
  if (components.length < 2) {
    throw new Error(`repository "${repository}" needs at least an owner and a name`);
  }
  for (const component of components) {
    if (!COMPONENT.test(component)) {
      throw new Error(`"${component}" is not a valid image path component`);
    }
  }

  const name = [host, ...components].join("/");
  if (name.length > MAX_NAME) {
    throw new Error(`image name is ${name.length} characters; the limit is ${MAX_NAME}`);
  }

  const version = normaliseTag(tag);
  if (!TAG.test(version)) {
    throw new Error(`tag "${tag}" cannot be normalised into a valid tag`);
  }

  return `${name}:${version}`;
}

function main(argv) {
  const [registry, repository, tag] = argv;
  if (!registry || !repository || !tag) {
    console.error("::error::usage: docker-image-ref.mjs <registry> <owner/repo> <tag>");
    return 1;
  }
  try {
    console.log(imageReference(registry, repository, tag));
    return 0;
  } catch (error) {
    console.error(`::error::Could not build a valid image reference: ${error.message}`);
    return 1;
  }
}

if (process.argv[1]?.includes("docker-image-ref")) {
  process.exitCode = main(process.argv.slice(2));
}
