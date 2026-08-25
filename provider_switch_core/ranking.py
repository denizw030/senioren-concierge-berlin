from __future__ import annotations
from .costs import first_and_following_year
from .models import ContractIntelligence, NeedProfile, NormalizedOffer, RankingResult
from .safety import safety_gate

WEIGHTS = {
    'need_fit': 30.0,
    'effective_cost': 25.0,
    'contract_flexibility': 12.0,
    'price_stability': 10.0,
    'performance_quality': 10.0,
    'customer_preferences': 8.0,
    'switch_risk': 5.0,
    'commission': 0.0,
    'partner_status': 0.0,
    'sponsored': 0.0,
}
RANKING_VERSION = 'nw-provider-core-v1'


def _clamp(v: float) -> float:
    return max(0.0, min(1.0, v))


def rank_offers(offers: list[NormalizedOffer], need: NeedProfile, contract: ContractIntelligence | None = None) -> list[RankingResult]:
    if not offers:
        return []
    costs: dict[str, float] = {}
    valid_costs: list[float] = []
    for offer in offers:
        try:
            first, following = first_and_following_year(offer)
            cost = (first.total + following.total) / 2.0
            costs[offer.offer_id] = cost
            valid_costs.append(cost)
        except ValueError:
            costs[offer.offer_id] = float('inf')
    low = min(valid_costs) if valid_costs else 0.0

    results: list[RankingResult] = []
    for offer in offers:
        blocked, review, reasons = safety_gate(contract, offer, need)
        c = costs[offer.offer_id]
        if c == float('inf'):
            blocked = True
            reasons.append('cost_not_calculable')
            cost_score = 0.0
        elif c <= 0 or low <= 0:
            cost_score = 1.0 if c == low else 0.0
        else:
            cost_score = _clamp(low / c)

        need_fit = 1.0
        if need.required_performance is not None:
            need_fit = 0.0 if offer.performance is None else _clamp(offer.performance / need.required_performance)
        flexibility = 1.0 if offer.minimum_term_months is None else _clamp(1.0 - max(0, offer.minimum_term_months - 1) / 35.0)
        price_stability = 0.5 if offer.price_guarantee_months is None else _clamp(offer.price_guarantee_months / 24.0)
        performance = 0.5 if offer.performance is None else 1.0
        preference = _clamp(offer.preference_match)
        risk = 1.0 - _clamp(offer.risk_score)

        components = {
            'need_fit': round(need_fit * WEIGHTS['need_fit'], 4),
            'effective_cost': round(cost_score * WEIGHTS['effective_cost'], 4),
            'contract_flexibility': round(flexibility * WEIGHTS['contract_flexibility'], 4),
            'price_stability': round(price_stability * WEIGHTS['price_stability'], 4),
            'performance_quality': round(performance * WEIGHTS['performance_quality'], 4),
            'customer_preferences': round(preference * WEIGHTS['customer_preferences'], 4),
            'switch_risk': round(risk * WEIGHTS['switch_risk'], 4),
            'commission': 0.0,
            'partner_status': 0.0,
            'sponsored': 0.0,
        }
        total = 0.0 if blocked else round(sum(components.values()), 4)
        results.append(RankingResult(offer.offer_id, total, components, blocked, review, tuple(reasons)))
    return sorted(results, key=lambda r: (r.blocked, -r.total_score, r.offer_id))
