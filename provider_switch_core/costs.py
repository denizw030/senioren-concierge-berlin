from __future__ import annotations
from .models import CostBreakdown, NormalizedOffer


def calculate_cost(offer: NormalizedOffer, months: int = 12) -> CostBreakdown:
    if months <= 0:
        raise ValueError('months must be positive')
    if offer.monthly_base_price is None:
        raise ValueError('monthly_base_price is required for cost calculation')
    if offer.variable_unit_price is not None and offer.annual_usage_units is None:
        raise ValueError('annual_usage_units required when variable_unit_price is set')
    promo_months = min(max(offer.promo_months, 0), months)
    post_promo_months = months - promo_months
    post_price = offer.monthly_price_after_promo if offer.monthly_price_after_promo is not None else offer.monthly_base_price
    recurring = offer.monthly_base_price * promo_months + post_price * post_promo_months
    variable = 0.0
    if offer.variable_unit_price is not None:
        variable = offer.variable_unit_price * offer.annual_usage_units * (months / 12.0)
    bonuses = offer.eligible_bonus_first_year if months <= 12 else offer.eligible_bonus_first_year
    total = recurring + variable + offer.one_time_costs + offer.hardware_costs + offer.connection_costs + offer.shipping_costs - bonuses
    return CostBreakdown(months, round(recurring, 2), round(variable, 2), round(offer.one_time_costs, 2), round(offer.hardware_costs, 2), round(offer.connection_costs, 2), round(offer.shipping_costs, 2), round(bonuses, 2), round(total, 2))


def first_and_following_year(offer: NormalizedOffer) -> tuple[CostBreakdown, CostBreakdown]:
    first = calculate_cost(offer, 12)
    if offer.monthly_base_price is None:
        raise ValueError('monthly_base_price required')
    post = offer.monthly_price_after_promo if offer.monthly_price_after_promo is not None else offer.monthly_base_price
    variable = 0.0
    if offer.variable_unit_price is not None:
        if offer.annual_usage_units is None:
            raise ValueError('annual_usage_units required')
        variable = offer.variable_unit_price * offer.annual_usage_units
    following_total = post * 12 + variable
    following = CostBreakdown(12, round(post * 12, 2), round(variable, 2), 0, 0, 0, 0, 0, round(following_total, 2))
    return first, following
