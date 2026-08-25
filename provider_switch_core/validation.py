from __future__ import annotations
from datetime import datetime, timezone
from .models import ContractIntelligence, NormalizedOffer
CRITICAL_CONTRACT_FIELDS={'electricity':{'provider','tariff','annual_usage_units'},'gas':{'provider','tariff','annual_usage_units'},'internet':{'provider','tariff'},'mobile':{'provider','tariff'}}
def validate_contract(contract):
    errors=[]
    for name in sorted(CRITICAL_CONTRACT_FIELDS.get(contract.product_type,{'provider','tariff'})):
        field=contract.fields.get(name)
        if field is None or not field.usable_for_decision: errors.append(f'{name}:missing_or_low_confidence')
    return (not errors,errors)
def _parse_iso(value): return datetime.fromisoformat(value.replace('Z','+00:00'))
def validate_offer(offer,now=None):
    errors=[]
    if offer.available is not True: errors.append('availability_not_verified')
    if offer.monthly_base_price is None or offer.monthly_base_price<0: errors.append('monthly_base_price_missing_or_invalid')
    if offer.variable_unit_price is not None and offer.annual_usage_units is None: errors.append('usage_required_for_variable_price')
    if offer.minimum_term_months is None: errors.append('minimum_term_missing')
    if offer.cancellation_notice_days is None: errors.append('cancellation_notice_missing')
    if not 0<=offer.risk_score<=1: errors.append('risk_score_out_of_range')
    if not 0<=offer.preference_match<=1: errors.append('preference_match_out_of_range')
    if offer.valid_until and offer.valid_until!='TEST_ONLY':
        try:
            expiry=_parse_iso(offer.valid_until); current=now or datetime.now(timezone.utc)
            if expiry.tzinfo is None: expiry=expiry.replace(tzinfo=timezone.utc)
            if current.tzinfo is None: current=current.replace(tzinfo=timezone.utc)
            if expiry<current: errors.append('offer_stale')
        except ValueError: errors.append('valid_until_invalid')
    return (not errors,errors)
