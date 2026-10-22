#!/usr/bin/env bash
# EXISTING AWS STAGING App ONLY, no PROD, no new resources.
set -Eeuo pipefail
umask 077
export AWS_DEFAULT_REGION=eu-central-1 AWS_PAGER=""
PIN=6cd6c8a0089cd0ddd00963bbd0b11d53e8f75258
HOST=d2h3bbcracss71.cloudfront.net
MODE="${1:---preflight}"
case "$MODE" in --preflight|--apply-auth-reviewed) ;; *) echo STOP_BAD_MODE; exit 2;; esac
if [[ "$MODE" == --apply-auth-reviewed ]]; then
  [[ "${STEWARO_STAGE_AUTH_REVIEWED:-}" == exact-staging-redirect-and-template-confirmed ]] || { echo STOP_AUTH_REDIRECT_NOT_APPROVED; exit 3; }
fi
for cmd in aws curl tar sha256sum node python3; do command -v "$cmd" >/dev/null || { echo "STOP_MISSING_$cmd"; exit 4; }; done
[[ "$(aws sts get-caller-identity --query Account --output text)" == 523859313789 ]] || { echo STOP_WRONG_AWS_ACCOUNT; exit 5; }
STACK=stewaro-web-staging
STATE="$(aws cloudformation describe-stacks --stack-name "$STACK" --query 'Stacks[0].StackStatus' --output text)"
case "$STATE" in CREATE_COMPLETE|UPDATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE) ;; *) echo STOP_STACK_NOT_STABLE; exit 6;; esac
BUCKET="$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='AppBucketName'].OutputValue | [0]" --output text)"
DIST="$(aws cloudformation describe-stacks --stack-name "$STACK" --query "Stacks[0].Outputs[?OutputKey=='AppDistributionId'].OutputValue | [0]" --output text)"
[[ "$BUCKET" != None && -n "$BUCKET" && "$DIST" != None && -n "$DIST" ]] || { echo STOP_UNKNOWN_STAGE_OUTPUTS; exit 7; }
[[ "$(aws cloudfront get-distribution --id "$DIST" --query Distribution.DomainName --output text)" == "$HOST" ]] || { echo STOP_WRONG_DISTRIBUTION; exit 8; }
[[ "$(aws s3api get-bucket-versioning --bucket "$BUCKET" --query Status --output text)" == Enabled ]] || { echo STOP_NO_S3_ROLLBACK; exit 9; }
DIR="$(mktemp -d "$HOME/stewaro-stage-XXXXXX")"
trap 'rm -rf "$DIR"' EXIT
mkdir "$DIR/repo"
curl -fLsS --max-time 120 --retry 2 -H 'Accept: application/vnd.github+json' "https://api.github.com/repos/denizw030/senioren-concierge-berlin/tarball/$PIN" -o "$DIR/source.tgz"
tar -xzf "$DIR/source.tgz" -C "$DIR/repo" --strip-components=1
cd "$DIR/repo"
FILES=(assets/stewaro-stage-auth.js assets/stewaro-stage-recovery.js assets/stewaro-stage-recovery.css web-concierge/stage-password-reset.html)
for FILE in "${FILES[@]}"; do [[ -f "$FILE" && ! -L "$FILE" ]] || { echo "STOP_MISSING_SOURCE:$FILE"; exit 10; }; done
node --check assets/stewaro-stage-auth.js
node --check assets/stewaro-stage-recovery.js
node --test tests/stewaro-stage-auth-recovery-disabled.test.mjs tests/stewaro-stage-recovery-callback.test.mjs
grep -Fq 'const STAGE_RECOVERY_ENABLED=false;' assets/stewaro-stage-auth.js
grep -Fq 'if(!STAGE_RECOVERY_ENABLED)return;' assets/stewaro-stage-auth.js
grep -Fq 'btqklftjmwtqqqdmwlnk.supabase.co' assets/stewaro-stage-recovery.js
grep -Fq 'd2h3bbcracss71.cloudfront.net' assets/stewaro-stage-recovery.js
echo STAGING_SOURCE_TESTS=PASS
for FILE in "${FILES[@]}"; do
  OLD="$(aws s3api head-object --bucket "$BUCKET" --key "$FILE" --query VersionId --output text 2>/dev/null || true)"
  printf 'ROLLBACK_PREVIOUS_VERSION %s %s\n' "$FILE" "$OLD"
done
if [[ "$MODE" == --preflight ]]; then
  echo 'PREFLIGHT_PASS AWS_WRITES=0 EMAILS_SENT=0 RESET_STILL_DISABLED=YES'
  exit 0
fi
# Patch only the single reviewed STAGING-only activation flag in temporary source.
python3 - <<'PY'
from pathlib import Path
p=Path("assets/stewaro-stage-auth.js")
s=p.read_text()
old="const STAGE_RECOVERY_ENABLED=false;"
if s.count(old)!=1: raise SystemExit("STOP_UNEXPECTED_FLAG")
p.write_text(s.replace(old,"const STAGE_RECOVERY_ENABLED=true;"))
PY
node --check assets/stewaro-stage-auth.js
for FILE in "${FILES[@]}"; do
  CACHE='public, max-age=300'
  case "$FILE" in *.html) CACHE='no-cache, max-age=0';; esac
  aws s3 cp "$FILE" "s3://$BUCKET/$FILE" --cache-control "$CACHE" --only-show-errors
done
aws cloudfront create-invalidation --distribution-id "$DIST" --paths '/assets/stewaro-stage-auth.js*' '/assets/stewaro-stage-recovery.js' '/assets/stewaro-stage-recovery.css' '/web-concierge/stage-password-reset.html' >/dev/null
for FILE in "${FILES[@]}"; do
  HASH="$(sha256sum "$FILE" | cut -d' ' -f1)"
  CHECKED=0
  for I in 1 2 3 4 5 6 7 8 9 10; do
    SERVED="$(curl -fsSL --max-time 10 "https://$HOST/$FILE" | sha256sum | cut -d' ' -f1)" || true
    if [[ "$HASH" == "$SERVED" ]]; then CHECKED=1; break; fi
    sleep 5
  done
  [[ "$CHECKED" == 1 ]] || { echo "STOP_HASH_MISMATCH $FILE; ROLLBACK_REQUIRED"; exit 11; }
done
echo 'STAGING_SERVING=GREEN_4_OF_4; RECOVERY_UI=ENABLED_STAGE_ONLY; PROD_WRITES=0; VOICE_NOT_TESTED'
