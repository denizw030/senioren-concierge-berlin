from __future__ import annotations
from .models import ContractIntelligence, NormalizedOffer

CRITICAL_CONTRACT_FIELDS = {
    'electricity': {'provider', 'tariff', 'annual_usage_units'},
    'gas': {'provider', 'tariff', 'annual_usage_units'},
    'internet': {'provider', 'tariff'},
    'mobile': {'provider', 'tariff'},
}

def validate_contract(contract: ContractIntelligence) -> tuple[bool, list[str]]:
    errors: list[str] = []
    required = CRITICAL_CONTRACT_FIELDS.get(contract.product_type, {'provider', 'tariff'})
    for name in sorted(required):
        field = contract.fields.get(name)
        if field is None or not field.usable_for_decision:
            errors.append(f'{name}:missing_or_low_confidence')
    return (not errors, errors)

def validate_offer(offer: NormalizedOffer) -> tuple[bool, list[str]]:
    errors: list[str] = []
    if offer.available is not True:
        errors.append('availability_not_verified')
    if offer.monthly_base_price is None or offer.monthly_base_price < 0:
        errors.append('monthly_base_price_missing_or_invalid')
    if offer.variable_unit_price is not None and offer.annual_usage_units is None:
        errors.append('usage_required_for_variable_price')
    if offer.minimum_term_months is None:
        errors.append('minimum_term_missing')
    if offer.cancellation_notice_days is None:
        errors.append('cancellation_notice_missing')
    if offer.risk_score < 0 or offer.risk_score > 1:
        errors.append('risk_score_out_of_range')
    if offer.preference_match < 0 or offer.preference_match > 1:
        errors.append('preference_match_out_of_range')
    return (not errors, errors)
