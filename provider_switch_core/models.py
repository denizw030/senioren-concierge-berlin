from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Optional

class VerificationStatus(str, Enum):
    VERIFIED = 'verified'
    PROBABLE = 'probable'
    UNCERTAIN = 'uncertain'
    MISSING = 'missing'

@dataclass(frozen=True)
class ExtractedField:
    value: Any
    confidence: float
    evidence: str = ''
    verification_status: VerificationStatus = VerificationStatus.UNCERTAIN

    def __post_init__(self):
        if not 0.0 <= self.confidence <= 1.0:
            raise ValueError('confidence must be between 0 and 1')
        if self.verification_status == VerificationStatus.MISSING and self.value is not None:
            raise ValueError('missing field must not contain a value')

    @property
    def usable_for_decision(self) -> bool:
        return self.value is not None and self.verification_status in {
            VerificationStatus.VERIFIED, VerificationStatus.PROBABLE
        } and self.confidence >= 0.80

@dataclass(frozen=True)
class ContractIntelligence:
    product_type: str
    fields: dict[str, ExtractedField]
    source_type: str = 'test'

@dataclass(frozen=True)
class NeedProfile:
    required_performance: Optional[float] = None
    preferred_price_stability: bool = False
    max_minimum_term_months: Optional[int] = None
    customer_preferences: dict[str, Any] = field(default_factory=dict)

@dataclass(frozen=True)
class CommercialMetadata:
    partner_status: str = 'none'
    sponsored: bool = False
    commission_amount: float = 0.0
    affiliate_network: Optional[str] = None

@dataclass(frozen=True)
class NormalizedOffer:
    offer_id: str
    provider_name: str
    tariff_name: str
    product_type: str
    monthly_base_price: Optional[float]
    variable_unit_price: Optional[float] = None
    annual_usage_units: Optional[float] = None
    one_time_costs: float = 0.0
    hardware_costs: float = 0.0
    connection_costs: float = 0.0
    shipping_costs: float = 0.0
    eligible_bonus_first_year: float = 0.0
    monthly_price_after_promo: Optional[float] = None
    promo_months: int = 0
    minimum_term_months: Optional[int] = None
    cancellation_notice_days: Optional[int] = None
    price_guarantee_months: Optional[int] = None
    performance: Optional[float] = None
    available: Optional[bool] = None
    source: str = 'TEST_FIXTURE'
    fetched_at: str = 'TEST_ONLY'
    valid_until: Optional[str] = None
    commercial: CommercialMetadata = field(default_factory=CommercialMetadata)
    risk_score: float = 0.0
    preference_match: float = 0.5

@dataclass(frozen=True)
class CostBreakdown:
    months: int
    recurring_base: float
    variable_usage: float
    one_time_costs: float
    hardware_costs: float
    connection_costs: float
    shipping_costs: float
    bonuses: float
    total: float

@dataclass(frozen=True)
class RankingResult:
    offer_id: str
    total_score: float
    components: dict[str, float]
    blocked: bool = False
    review_required: bool = False
    reasons: tuple[str, ...] = ()
