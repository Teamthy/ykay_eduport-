#!/usr/bin/env bash
#
# new-school-clone.sh — bootstrap a NEW school's repository from this platform.
#
#   bash scripts/new-school-clone.sh \
#     --dest ../Famex-Os \
#     --origin https://github.com/Teamthy/Famex-Os.git
#
#   # from a local checkout (no network), dry run first:
#   bash scripts/new-school-clone.sh --source /path/to/ykay_eduport- \
#     --dest /tmp/Famex-Os --origin git@github.com:Teamthy/Famex-Os.git --dry-run
#
# ── Why this exists ────────────────────────────────────────────────────────
# Cloning this repo by hand is four commands, and one of them is easy to get
# wrong: `git clone` leaves `origin` pointing at THIS repo. The next `git push`
# then publishes a second school's work into the reference repository — the
# exact accident the two-repo split exists to prevent.
#
# So the script does the safe version of the sequence:
#
#   1. clone the code (no history — a fork's history is baggage, and it carries
#      any historical secret with it)
#   2. throw away the source .git and start a fresh repository on `main`
#   3. point `origin` at the NEW repo, and add the source as a read-only
#      `upstream` whose PUSH URL is deliberately disabled
#   4. harden .gitignore (a symlinked node_modules slips past `node_modules/`)
#   5. scan the tracked files for secrets before anything is ever pushed
#   6. create `.env` from `.env.example` with fresh secrets and the previous
#      school's identity blanked out
#   7. commit, print what is still missing, and refuse to guess the rest
#
# It is deliberately loud about everything it does NOT do (DNS, databases,
# vendor accounts, the brand burn-down) rather than pretending to finish setup.
#
# Exit codes: 0 ok · 1 usage/guard failure · 2 a step failed.
set -euo pipefail

SOURCE_DEFAULT="https://github.com/Teamthy/ykay_eduport-.git"
SOURCE="$SOURCE_DEFAULT"
DEST=""
ORIGIN=""
NAME=""
SKIP_INSTALL=0
RUN_CHECKS=0
NO_UPSTREAM=0
DRY_RUN=0
SKIP_ENV=0

# ── output helpers ─────────────────────────────────────────────────────────
bold() { printf '\033[1m%s\033[0m\n' "$*"; }
step() { printf '\n\033[1m[%s/%s]\033[0m %s\n' "$1" "$TOTAL_STEPS" "$2"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*" >&2; }
die()  { printf '\n\033[31mfix-this:\033[0m %s\n' "$*" >&2; exit 1; }
TOTAL_STEPS=8

usage() {
  cat <<'USAGE'
Bootstrap a new school repository from the Ykay College / Famex OS platform.

Usage:
  bash scripts/new-school-clone.sh --dest <path> [options]

Required:
  --dest <path>        Where to create the new repository. Must not exist, or be empty.

Options:
  --source <url|path>  Source repository (default: the Ykay GitHub repo).
  --origin <url>       New repository URL for `origin`. Omit to leave origin unset
                       (nothing can be pushed until you set it deliberately).
  --name <text>        Product name used in the seed commit and the summary.
  --skip-install       Do not run `npm ci` (useful offline, or when you only want the repo).
  --checks             Run typecheck + tests after install (slow, needs the Prisma engine).
  --no-upstream        Do not add the source as a read-only `upstream` remote.
  --skip-env           Do not create `.env` (when you will supply your own).
  --dry-run            Print every step without changing anything.
  -h | --help          This text.
USAGE
}

# ── arguments ──────────────────────────────────────────────────────────────
while [ $# -gt 0 ]; do
  case "$1" in
    --source) SOURCE="${2:?--source needs a value}"; shift 2 ;;
    --dest) DEST="${2:?--dest needs a value}"; shift 2 ;;
    --origin) ORIGIN="${2:?--origin needs a value}"; shift 2 ;;
    --name) NAME="${2:?--name needs a value}"; shift 2 ;;
    --skip-install) SKIP_INSTALL=1; shift ;;
    --checks) RUN_CHECKS=1; shift ;;
    --no-upstream) NO_UPSTREAM=1; shift ;;
    --skip-env) SKIP_ENV=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) die "unknown option '$1' (try --help)" ;;
  esac
done

[ -n "$DEST" ] || { usage; die "--dest is required"; }

# ── guard: never nest a repo inside another one ────────────────────────────
# The classic accident is running this from inside the source checkout with
# `--dest ./new-school`, which creates a repo inside a repo.
DEST_DIR="$(dirname "$DEST")"
DEST_BASE="$(basename "$DEST")"
mkdir -p "$DEST_DIR" 2>/dev/null || true
DEST_DIR_ABS="$(cd "$DEST_DIR" && pwd)"
DEST_ABS="$DEST_DIR_ABS/$DEST_BASE"

if ROOT="$(git rev-parse --show-toplevel 2>/dev/null)"; then
  case "$DEST_ABS" in
    "$ROOT"|"$ROOT"/*)
      die "'$DEST' is inside the git repository at '$ROOT'.
     A repository inside another repository breaks both (and this script's
     whole point is keeping the two apart). Choose a path outside it, e.g.
     --dest ../$(basename "$DEST")"
      ;;
  esac
fi

case "$SOURCE" in
  /*|./*|../*)
    if [ -d "$SOURCE" ] && [ "$(cd "$SOURCE" && pwd)" = "$DEST_ABS" ]; then
      die "--source and --dest resolve to the same directory ($DEST_ABS)"
    fi
    ;;
esac

if git remote get-url "$SOURCE" >/dev/null 2>&1 && [ -n "$ORIGIN" ]; then
  if [ "$(git remote get-url "$SOURCE")" = "$ORIGIN" ]; then
    die "--origin is the same as --source; origin must point at the NEW repository"
  fi
fi

if [ "$SOURCE" = "$ORIGIN" ] && [ -n "$ORIGIN" ]; then
  die "--origin must not equal --source (that is the accident this script prevents)"
fi

NAME="${NAME:-$DEST_BASE}"

# ── preflight ──────────────────────────────────────────────────────────────
bold "Bootstrap: $NAME"
echo "  source   : $SOURCE"
echo "  dest     : $DEST_ABS"
echo "  origin   : ${ORIGIN:-(unset — you will add it yourself)}"
echo "  upstream : $( [ "$NO_UPSTREAM" = 1 ] && echo "skip" || echo "read-only")"
echo "  mode     : $( [ "$DRY_RUN" = 1 ] && echo "DRY RUN (nothing will change)" || echo "live")"

command -v git >/dev/null 2>&1 || die "git is not installed"
git --version | sed 's/^/  git      : /'

if command -v node >/dev/null 2>&1; then
  NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
  echo "  node     : $(node -v)"
  [ "$NODE_MAJOR" -ge 20 ] 2>/dev/null || warn "Next.js 16 needs Node 20+; you have $(node -v)"
else
  warn "node is not installed — install Node 20+ before installing dependencies"
fi

if [ -e "$DEST_ABS" ]; then
  if [ -d "$DEST_ABS" ] && [ -z "$(ls -A "$DEST_ABS" 2>/dev/null)" ]; then
    ok "destination exists and is empty — using it"
  else
    die "'$DEST' already exists and is not empty.
     Refusing to touch it: this script never merges into an existing tree.
     Move it aside, or pick another --dest."
  fi
fi

if [ "$DRY_RUN" = 1 ]; then
  printf '\n(feeling dry) would now: clone → reset history → set remotes → harden .gitignore → scan secrets → write .env → commit\n'
  exit 0
fi

# ── 1. clone the code ──────────────────────────────────────────────────────
step 1 "Cloning the platform (code only, depth 1)"
if git clone --depth=1 --quiet "$SOURCE" "$DEST_ABS"; then
  ok "cloned into $DEST_ABS"
else
  die "clone failed. Check the source URL/path and your network, then re-run."
fi
cd "$DEST_ABS"

# A dropped source .git is the point: no inherited history, no inherited
# remote, no inherited contributor emails, nothing to accidentally push.
SOURCE_HEAD="$(git rev-parse --short HEAD 2>/dev/null || echo unknown)"

# ── 2. fresh history ───────────────────────────────────────────────────────
step 2 "Resetting history (fresh root commit on main)"
rm -rf .git
git init --quiet
git symbolic-ref HEAD refs/heads/main 2>/dev/null || git checkout -b main >/dev/null 2>&1
# A local identity keeps the first commit from failing on a fresh machine; it is
# repo-local only and easy to change.
git config user.name  >/dev/null 2>&1 || git config user.name  "New School Build"
git config user.email >/dev/null 2>&1 || git config user.email "build@localhost"
ok "empty repository initialised on 'main' (source was $SOURCE_HEAD, history intentionally dropped)"

# ── 3. harden .gitignore ───────────────────────────────────────────────────
step 3 "Hardening .gitignore"
if [ -f .gitignore ]; then
  if grep -qx 'node_modules/' .gitignore; then
    # `node_modules/` matches a DIRECTORY only. A hoisted/symlinked node_modules
    # therefore sneaks into the index and breaks `npm ci` on a fresh clone.
    awk '{ if ($0 == "node_modules/") print "node_modules"; else print }' .gitignore > .gitignore.tmp \
      && mv .gitignore.tmp .gitignore
    ok "node_modules/ → node_modules (also catches a symlink)"
  else
    ok "node_modules rule already safe"
  fi
  ok ".env is ignored: $(grep -cE '^\.env' .gitignore) rule(s)"
else
  warn "no .gitignore found — check the source repo before committing"
fi

# ── 4. remotes ─────────────────────────────────────────────────────────────
step 4 "Configuring remotes"
if [ -n "$ORIGIN" ]; then
  git remote add origin "$ORIGIN"
  ok "origin → $ORIGIN  (a push can only ever reach the new repository)"
else
  warn "origin NOT set — nothing can be pushed until you run:
       git remote add origin <your-new-repo-url>"
fi

if [ "$NO_UPSTREAM" = 0 ]; then
  git remote add upstream "$SOURCE"
  # Read-only by construction: the push URL points at a directory that can
  # never be a repository, so a stray `git push upstream` fails loudly instead
  # of publishing into the reference repository. Fetching is unaffected.
  git remote set-url --push upstream "$DEST_ABS/.read-only-upstream-do-not-push"
  ok "upstream → $SOURCE  (push disabled: $(git remote get-url --push upstream))"
fi

# ── 5. secret scan ─────────────────────────────────────────────────────────
step 5 "Scanning tracked files for secrets (before anything is pushed)"
SECRET_HITS=0

RISKY_FILES="$(git ls-files | grep -Ei '(^|/)(\.env($|\.)|[^/]*\.(pem|key|p12|jks|keystore|mobileprovision)$|credentials|id_rsa|google-services\.json)' | grep -v '\.env\.example$' || true)"
if [ -n "$RISKY_FILES" ]; then
  warn "files that usually hold credentials are tracked:"
  printf '       %s\n' $RISKY_FILES
  SECRET_HITS=$((SECRET_HITS + 1))
fi

PATTERNS='AKIA[0-9A-Z]{16}|ASIA[0-9A-Z]{16}|sk_live_[0-9A-Za-z]{8,}|sk_test_[0-9A-Za-z]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|xox[baprs]-[0-9A-Za-z-]{10,}|ghp_[0-9A-Za-z]{20,}|AIza[0-9A-Za-z_-]{30,}'
CONTENT_HITS="$(git grep -InE "$PATTERNS" -- . 2>/dev/null | head -20 || true)"
if [ -n "$CONTENT_HITS" ]; then
  warn "possible live credentials in tracked source (review each one):"
  printf '%s\n' "$CONTENT_HITS" | sed 's/^/       /'
  SECRET_HITS=$((SECRET_HITS + 1))
fi

if [ "$SECRET_HITS" = 0 ]; then
  ok "no credential-shaped files or strings found"
else
  warn "review the findings above BEFORE pushing anywhere. History cannot be un-published."
fi

# ── 6. environment file ────────────────────────────────────────────────────
step 6 "Creating .env from .env.example"
gen_secret() {
  if command -v openssl >/dev/null 2>&1; then
    openssl rand -base64 48 | tr -d '\n=+/' | cut -c1-48
  elif command -v node >/dev/null 2>&1; then
    node -e 'process.stdout.write(require("crypto").randomBytes(36).toString("base64url"))'
  else
    warn "neither openssl nor node available — leaving secrets blank"; echo ""
  fi
}

set_env() { # key value file
  local key="$1" value="$2" file="$3"
  awk -v key="$key" -v val="$value" '
    index($0, key "=") == 1 { print key "=\"" val "\""; found = 1; next }
    { print }
    END { if (!found) print key "=\"" val "\"" }
  ' "$file" > "$file.new" && mv "$file.new" "$file"
}

if [ "$SKIP_ENV" = 1 ]; then
  ok "skipped (--skip-env)"
elif [ -f .env ]; then
  warn ".env already exists — leaving it untouched"
elif [ ! -f .env.example ]; then
  warn "no .env.example in the source repo — create .env by hand"
else
  cp .env.example .env

  # Fresh secrets so the new deployment shares nothing with the old one.
  set_env AUTH_SECRET  "$(gen_secret)" .env
  set_env JOBS_SECRET  "$(gen_secret)" .env
  set_env CRON_SECRET  "$(gen_secret)" .env

  # Blank the previous school's identity: a name left in place is how one
  # school's contact details end up on another school's receipts.
  for key in SCHOOL_SLUG SCHOOL_NAME SCHOOL_ADDRESS SCHOOL_PHONE SCHOOL_EMAIL SCHOOL_MOTTO \
             SCHOOL_CUSTOM_DOMAIN INITIAL_ADMIN_EMAIL INITIAL_ADMIN_NAME \
             SUPER_ADMIN_EMAIL SUPER_ADMIN_NAME EMAIL_FROM \
             BOOTSTRAP_TEACHER_EMAIL BOOTSTRAP_STUDENT_EMAIL BOOTSTRAP_PARENT_EMAIL \
             NEXT_PUBLIC_APK_URL PLATFORM_BASE_DOMAIN; do
    grep -q "^${key}=" .env && set_env "$key" "" .env
  done
  set_env NEXT_PUBLIC_SITE_URL "http://localhost:3000" .env

  # Lock the file down LAST: the edits above rewrite it via mv, which would
  # otherwise leave the permissions of the temporary file.
  chmod 600 .env 2>/dev/null || true

  ok ".env created (chmod 600) with new AUTH_SECRET / JOBS_SECRET / CRON_SECRET"
  ok "previous school's identity blanked — fill in your own before seeding"
fi

# ── 7. first commit ────────────────────────────────────────────────────────
step 7 "Creating the seed commit"
git add -A
TRACKED="$(git ls-files | wc -l | tr -d ' ')"
if git ls-files | grep -q '^node_modules'; then
  die "node_modules is staged — the .gitignore hardening above did not take effect"
fi
git commit --quiet -m "Initial import: $NAME

Base platform imported from $SOURCE_HEAD as a fresh history. Multi-tenant
platform layer (EDUos) and the previous school's branding are still present and
are stripped as the first workstream — see docs/famex/07-master-build-prompt.md
§2 for the exact list."
ok "committed $TRACKED tracked files as $(git rev-parse --short HEAD)"

# ── 8. dependencies ────────────────────────────────────────────────────────
step 8 "Dependencies"
if [ "$SKIP_INSTALL" = 1 ]; then
  warn "skipped (--skip-install) — run 'npm ci' before anything else"
elif [ ! -f package-lock.json ]; then
  warn "no package-lock.json — run 'npm install' (and commit the lockfile)"
elif ! command -v npm >/dev/null 2>&1; then
  warn "npm not found — install Node 20+ then run 'npm ci'"
else
  if npm ci --no-audit --no-fund >/dev/null 2>&1; then
    ok "npm ci complete"
    if npx prisma generate >/dev/null 2>&1; then
      ok "prisma client generated"
    else
      warn "prisma generate failed (it downloads an engine — offline or a proxy will do this).
       Re-run 'npx prisma generate' when you have network."
    fi
    if [ "$RUN_CHECKS" = 1 ]; then
      npm run typecheck >/dev/null 2>&1 && ok "typecheck clean" || warn "typecheck reported problems — read the output yourself"
      npm test >/dev/null 2>&1 && ok "tests pass" || warn "tests reported failures — read the output yourself"
    fi
  else
    warn "npm ci failed — run it yourself and read the error"
  fi
fi

# ── summary ────────────────────────────────────────────────────────────────
printf '\n'
bold "Done — $DEST_ABS is a standalone repository"
echo "  commits  : $(git rev-list --count HEAD) (fresh root, no inherited history)"
echo "  origin   : $(git remote get-url origin 2>/dev/null || echo '(unset)')"
if [ "$NO_UPSTREAM" = 0 ]; then
  echo "  upstream : $(git remote get-url upstream) (read-only)"
fi

cat <<'NEXT'

Still to do — the script deliberately does not guess any of this:

  1. Create the repository on GitHub, then push:
       git remote add origin <url>      # if you did not pass --origin
       git push -u origin main
  2. Fill .env with YOUR values. All of these must be new, never copied:
       DATABASE_URL (a NEW database) · PAYSTACK_* · WHATSAPP_TOKEN +
       WHATSAPP_PHONE_NUMBER_ID + WHATSAPP_APP_SECRET · RESEND_API_KEY ·
       S3_* / R2_* · UPSTASH_REDIS_REST_URL + TOKEN · SENTRY_* ·
       SCHOOL_NAME / SLUG / PHONE / EMAIL / ADDRESS / MOTTO
  3. Run the first workstream: strip the EDUos platform layer and rebrand.
       docs/famex/07-master-build-prompt.md §2 (strip list) and §5 (W1)
       npm run audit:brand    → see the 550 brand literals you are burning down
  4. Protect main and require PRs before you invite anyone to contribute.

Never do these:
  ✗ git remote add origin <the source repo>     (that is a fork, not a copy)
  ✗ git push upstream                            (push URL is disabled on purpose)
  ✗ copy .env, .next/ or node_modules from the old school
  ✗ point this deployment at the old school's database
NEXT
