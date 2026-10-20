#!/usr/bin/env bash
# STEWARO App STAGING ONLY. No production, account, website or infrastructure writes.
set -Eeuo pipefail
export AWS_DEFAULT_REGION=eu-central-1 AWS_PAGER=""
PIN="d1fbb97f59a986ad34c7d7435ce7f063fbf52240"
DOMAIN="d2h3bbcracss71.cloudfront.net"
if [[ "$#" -ne 1 || "$1" != "--apply" ]]; then echo "STOP: expected --apply"; exit 2; fi
for cmd in aws curl tar sha256sum node; do
  command -v "$cmd" >/dev/null || { echo "STOP: missing $cmd"; exit 3; }
done
account="$(aws sts get-caller-identity --query Account --output text)"
[[ "$account" == "523859313789" ]] || { echo "STOP: wrong AWS account"; exit 4; }
state="$(aws cloudformation describe-stacks --stack-name stewaro-web-staging --query 'Stacks[0].StackStatus' --output text)"
case "$state" in CREATE_COMPLETE|UPDATE_COMPLETE|UPDATE_ROLLBACK_COMPLETE) ;; *) echo "STOP: stack status=$state"; exit 5 ;; esac
bucket="$(aws cloudformation describe-stacks --stack-name stewaro-web-staging --query "Stacks[0].Outputs[?OutputKey=='AppBucketName'].OutputValue | [0]" --output text)"
dist="$(aws cloudformation describe-stacks --stack-name stewaro-web-staging --query "Stacks[0].Outputs[?OutputKey=='AppDistributionId'].OutputValue | [0]" --output text)"
[[ -n "$bucket" && "$bucket" != None && -n "$dist" && "$dist" != None ]] || { echo "STOP: staging app outputs absent"; exit 6; }
actual_domain="$(aws cloudfront get-distribution --id "$dist" --query 'Distribution.DomainName' --output text)"
[[ "$actual_domain" == "$DOMAIN" ]] || { echo "STOP: unexpected distribution"; exit 7; }
versioning="$(aws s3api get-bucket-versioning --bucket "$bucket" --query Status --output text)"
[[ "$versioning" == Enabled ]] || { echo "STOP: no S3 rollback versions"; exit 8; }
work="$(mktemp -d "$HOME/stewaro-app-stage-XXXXXXXX")"
trap 'rm -rf "$work"' EXIT
mkdir "$work/source"
curl -fLsS --retry 2 --max-time 180 -H 'Accept: application/vnd.github+json' \
  "https://api.github.com/repos/denizw030/senioren-concierge-berlin/tarball/$PIN" -o "$work/site.tar.gz"
tar -xzf "$work/site.tar.gz" -C "$work/source" --strip-components=1
cd "$work/source"
# Refuse unsafe or stale code BEFORE touching any AWS object.
grep -Fq 'fidelRoom:false,' assets/web-live-concierge.js
grep -Fq 'getAuthToken:async()=>{' assets/web-live-concierge.js
grep -Fq 'if(location.hostname==="d2h3bbcracss71.cloudfront.net")' assets/web-customer-concierge.js
grep -Fq 'input.disabled=true;' assets/web-customer-concierge.js
for f in assets/auth-nav.js assets/web-voice-memo.js assets/stewaro-customer-call-join.js; do
  grep -Fq 'if(location.hostname==="d2h3bbcracss71.cloudfront.net")return;' "$f"
done
grep -Fq 'canvas data-fidel-orb' web-concierge/index.html
grep -Fq 'stewaro-stage-auth.js?v=1' web-concierge/index.html
grep -Fq 'btqklftjmwtqqqdmwlnk.supabase.co' assets/stewaro-stage-auth.js
cat > "$work/files" <<'FILELIST'
web-concierge/index.html
assets/clean-url.js
assets/stewaro-csp-web-concierge-script-1.js
assets/stewaro-csp-web-concierge-attributes.css
assets/stewaro-csp-web-concierge-submit.js
assets/site.css
assets/brand-2026.css
assets/nahwerk-logo-v2.css
assets/web-customer-concierge.css
assets/stewaro-app.css
assets/web-voice-memo.css
assets/nahwerk-live-concierge.css
assets/stewaro-customer-call-join.css
assets/stewaro-stage-auth.js
assets/stewaro-stage-auth.css
assets/stewaro-unified.css
assets/logos/stewaro-icon.svg
assets/logos/stewaro-wordmark.svg
assets/stewaro-app-bootstrap.js
assets/stewaro-app-shell.js
assets/auth-nav.js
assets/site-ui.js
assets/web-customer-concierge.js
assets/web-voice-memo.js
assets/web-live-concierge.js
assets/fidel-gold-orb.js
assets/nahwerk-live-concierge.js
assets/fidel-live-room.js
assets/stewaro-customer-call-join.js
assets/vendor/twilio-voice-sdk-2.18.5.min.js
FILELIST
while IFS= read -r file; do
  [[ -f "$file" && ! -L "$file" ]] || { echo "STOP: missing/static path $file"; exit 9; }
done < "$work/files"
node --check assets/stewaro-stage-auth.js
node --check assets/web-customer-concierge.js
node --test tests/stewaro-launch-voice-orb-no3d.test.mjs > "$work/node-test.log" 2>&1 ||
  { echo "STOP: source tests failed"; tail -n 25 "$work/node-test.log"; exit 10; }
echo "STAGING_SOURCE_TESTS=PASS"
echo "STAGING_ONLY_APP_BUCKET=$bucket"
echo "STAGING_PIN=$PIN"
# Only whitelisted keys in the existing STAGING App bucket; no deletes.
while IFS= read -r file; do
  case "$file" in
    *.html) cache='no-cache, max-age=0' ;;
    *) cache='public, max-age=300' ;;
  esac
  aws s3 cp "$file" "s3://$bucket/$file" --cache-control "$cache" --only-show-errors
done < "$work/files"
# A single bounded invalidation on the App STAGING distribution only.
aws cloudfront create-invalidation --distribution-id "$dist" --paths '/' '/web-concierge/*' '/assets/*' >/dev/null
for file in web-concierge/index.html assets/web-live-concierge.js assets/web-customer-concierge.js assets/auth-nav.js assets/web-voice-memo.js assets/stewaro-customer-call-join.js; do
  local_sha="$(sha256sum "$file" | cut -d' ' -f1)"
  verified=no
  for attempt in 1 2 3 4 5 6 7 8 9 10; do
    served_sha="$(curl -fsSL --max-time 12 "https://$DOMAIN/$file" | sha256sum | cut -d' ' -f1)" || true
    if [[ "$served_sha" == "$local_sha" ]]; then verified=yes; break; fi
    sleep 5
  done
  [[ "$verified" == yes ]] || { echo "STOP: served file differs: $file (restore via S3 versioning)"; exit 11; }
done
echo "STAGING_APP_SERVING=GREEN_6_OF_6"
echo "STAGING_ONLY_RELEASE=GREEN"
echo "PROD_ACCOUNT_WEBSITE_WRITES=0"
echo "VOICE_AND_AUTH_E2E=NOT_YET_TESTED"
