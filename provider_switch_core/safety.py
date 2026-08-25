from .validation import validate_contract, validate_offer
def safety_gate(contract,offer,need):
    reasons=[]; review=False
    if contract is not None:
        ok,errs=validate_contract(contract)
        if not ok: reasons.extend(errs); review=True
    ok,errs=validate_offer(offer)
    if not ok: reasons.extend(errs)
    if need.required_performance is not None and (offer.performance is None or offer.performance<need.required_performance): reasons.append('required_performance_not_met')
    if need.max_minimum_term_months is not None and offer.minimum_term_months is not None and offer.minimum_term_months>need.max_minimum_term_months: reasons.append('minimum_term_exceeds_preference')
    blocked=any(r in reasons for r in ('availability_not_verified','monthly_base_price_missing_or_invalid','usage_required_for_variable_price','required_performance_not_met','offer_stale'))
    return blocked,review,reasons
def execution_allowed(*_args,**_kwargs): return False
