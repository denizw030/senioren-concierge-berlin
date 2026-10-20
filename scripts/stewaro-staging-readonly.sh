#!/usr/bin/env bash
# Existing AWS STAGING account/app inventory ONLY. Never deploy, build, sync or invalidate.
set -euo pipefail
export AWS_DEFAULT_REGION=eu-central-1 AWS_PAGER=""
expected="523859313789"
account="$(aws sts get-caller-identity --query Account --output text)"
printf "AWS-KONTO: %s\n" "$account"
if [[ "$account" != "$expected" ]]; then
  echo "STOP: AWS-Konto stimmt nicht überein."
  exit 2
fi
for stack in stewaro-web-staging stewaro-web-prod-candidate-v3; do
  echo "=== $stack ==="
  if ! aws cloudformation describe-stacks --stack-name "$stack" \
    --query 'Stacks[0].{Status:StackStatus,Outputs:Outputs}' \
    --output json; then
    echo "NICHT LESBAR: $stack"
  fi
done
echo "=== STAGING ACCOUNT/APP CLOUDFRONT ==="
for key in AccountDistributionId AppDistributionId; do
  id="$(aws cloudformation describe-stacks --stack-name stewaro-web-staging \
    --query "Stacks[0].Outputs[?OutputKey=='${key}'].OutputValue | [0]" \
    --output text 2>/dev/null || true)"
  if [[ -z "$id" || "$id" == None ]]; then
    echo "$key: NICHT ERMITTELT"
    continue
  fi
  echo "$key: $id"
  aws cloudfront get-distribution --id "$id" \
    --query 'Distribution.{Domain:DomainName,Status:Status,Enabled:DistributionConfig.Enabled,Aliases:DistributionConfig.Aliases.Items}' \
    --output json || echo "Verteilung konnte nicht gelesen werden."
done
echo "FERTIG: Nur gelesen; keine AWS-Änderung."
