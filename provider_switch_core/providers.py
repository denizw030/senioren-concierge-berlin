from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from urllib.parse import urlparse
from .models import CommercialMetadata, LocationValidationResult, NeedProfile, NormalizedOffer, OfferSearchRequest, ProviderCapabilities

class ProviderIntegrationError(RuntimeError): pass
class MissingPartnerConfiguration(ProviderIntegrationError): pass
class ProviderUnavailable(ProviderIntegrationError): pass
class ProviderRateLimited(ProviderIntegrationError): pass
class StructuredSearchUnavailable(ProviderIntegrationError, NotImplementedError): pass

def _coerce_request(request, region=None, need=None):
    if isinstance(request, OfferSearchRequest): return request
    return OfferSearchRequest(str(request), region or '', need=need or NeedProfile())

class ProviderAdapter(ABC):
    @abstractmethod
    def search_offers(self, request: OfferSearchRequest, region=None, need=None) -> list[NormalizedOffer]: raise NotImplementedError
    @abstractmethod
    def get_offer_details(self, provider_offer_id: str) -> NormalizedOffer: raise NotImplementedError
    @abstractmethod
    def validate_location(self, request: OfferSearchRequest) -> LocationValidationResult: raise NotImplementedError
    @abstractmethod
    def normalize_offer(self, raw: dict) -> NormalizedOffer: raise NotImplementedError
    @abstractmethod
    def get_provider_capabilities(self) -> ProviderCapabilities: raise NotImplementedError

@dataclass
class FixtureProviderAdapter(ProviderAdapter):
    fixtures: list[NormalizedOffer]
    def search_offers(self, request, region=None, need=None):
        request=_coerce_request(request,region,need)
        return [o for o in self.fixtures if o.product_type == request.product_type and o.source == 'TEST_FIXTURE']
    def get_offer_details(self, provider_offer_id):
        for offer in self.fixtures:
            if offer.offer_id == provider_offer_id and offer.source == 'TEST_FIXTURE': return offer
        raise KeyError(provider_offer_id)
    def validate_location(self, request):
        request=_coerce_request(request)
        return LocationValidationResult(bool(request.postal_code), bool(request.postal_code), None if request.postal_code else 'postal_code_required')
    def normalize_offer(self, raw): return NormalizedOffer(**raw)
    def get_provider_capabilities(self):
        return ProviderCapabilities('fixture', ('electricity','gas','internet','mobile'), True, True, True, False, False, False, False, False, True, ('TEST_ONLY',))

@dataclass
class VerivoxAdapter(ProviderAdapter):
    partner_contract_configured: bool = False
    fixture_responses: list[dict] = field(default_factory=list)
    def _require_contract(self):
        if not self.partner_contract_configured:
            raise MissingPartnerConfiguration('Verivox Webservice requires a separate partner/Webservice contract and issued technical documentation/access data')
    def search_offers(self, request, region=None, need=None):
        request=_coerce_request(request,region,need); self._require_contract()
        if request.product_type not in {'electricity','gas'}:
            raise StructuredSearchUnavailable('Public Verivox documentation confirms the partner Webservice for electricity/gas only; no public structured telco API contract is documented')
        if not self.fixture_responses:
            raise ProviderUnavailable('No real Verivox endpoint/credentials configured; production HTTP is intentionally not implemented')
        return [self.normalize_offer(x) for x in self.fixture_responses if x.get('product_type') == request.product_type]
    def get_offer_details(self, provider_offer_id):
        self._require_contract()
        for raw in self.fixture_responses:
            if raw.get('offer_id') == provider_offer_id: return self.normalize_offer(raw)
        raise ProviderUnavailable('Offer detail retrieval requires partner response data or a documented endpoint')
    def validate_location(self, request):
        request=_coerce_request(request)
        if not request.postal_code: return LocationValidationResult(False, False, 'postal_code_required')
        return LocationValidationResult(True, False, 'provider_side_location_validation_requires_partner_webservice')
    def normalize_offer(self, raw):
        if raw.get('fixture_schema') != 'NAHWERK_VERIVOX_TEST_FIXTURE_V1':
            raise ValueError('Only explicit NAHWERK Verivox test fixtures may be normalized without partner API documentation')
        return NormalizedOffer(offer_id=raw['offer_id'],provider_name=raw['provider_name'],tariff_name=raw['tariff_name'],product_type=raw['product_type'],monthly_base_price=raw.get('monthly_base_price'),variable_unit_price=raw.get('variable_unit_price'),annual_usage_units=raw.get('annual_usage_units'),one_time_costs=raw.get('one_time_costs',0),hardware_costs=raw.get('hardware_costs',0),connection_costs=raw.get('connection_costs',0),shipping_costs=raw.get('shipping_costs',0),eligible_bonus_first_year=raw.get('eligible_bonus_first_year',0),monthly_price_after_promo=raw.get('monthly_price_after_promo'),promo_months=raw.get('promo_months',0),minimum_term_months=raw.get('minimum_term_months'),cancellation_notice_days=raw.get('cancellation_notice_days'),price_guarantee_months=raw.get('price_guarantee_months'),performance=raw.get('performance'),available=raw.get('available'),source='VERIVOX_TEST_FIXTURE',fetched_at=raw.get('fetched_at','TEST_ONLY'),valid_until=raw.get('valid_until'),risk_score=raw.get('risk_score',0),preference_match=raw.get('preference_match',0.5),commercial=CommercialMetadata(affiliate_program='Verivox Partnerprogramm TEST FIXTURE',commission_type=raw.get('commission_type'),commission_value=raw.get('commission_value'),confirmed=False))
    def get_provider_capabilities(self):
        return ProviderCapabilities('verivox',('electricity','gas','internet','mobile'),True,True,True,True,True,True,True,True,False,('Structured Webservice publicly confirmed for electricity/gas; separate contract required.','Public partner page lists DSL/mobile marketing via iFrame/link-out and asks partners to contact Verivox for APIs/deep integration.','Authentication, endpoint schema, sandbox and rate limits are not publicly documented in sufficient detail.'))

@dataclass
class Check24Adapter(ProviderAdapter):
    partner_deep_link: str | None = None
    tracking_id: str | None = None
    fixture_offers: list[NormalizedOffer] = field(default_factory=list)
    def search_offers(self, request, region=None, need=None):
        request=_coerce_request(request,region,need)
        if self.fixture_offers: return [o for o in self.fixture_offers if o.product_type == request.product_type and o.source == 'CHECK24_TEST_FIXTURE']
        raise StructuredSearchUnavailable('CHECK24 public partner materials confirm comparison calculators/whitelabel and direct links, but no public structured offer API contract')
    def get_offer_details(self, provider_offer_id):
        for offer in self.fixture_offers:
            if offer.offer_id == provider_offer_id and offer.source == 'CHECK24_TEST_FIXTURE': return offer
        raise StructuredSearchUnavailable('No public CHECK24 structured offer-detail API contract confirmed')
    def validate_location(self, request):
        request=_coerce_request(request)
        return LocationValidationResult(bool(request.postal_code),False,'location_check_occurs_in_CHECK24_comparison_flow')
    def normalize_offer(self, raw):
        if raw.get('source') != 'CHECK24_TEST_FIXTURE': raise ValueError('Only explicit CHECK24 test fixtures can be normalized without a structured API contract')
        return NormalizedOffer(**raw)
    def build_link_out(self):
        if not self.partner_deep_link or not self.tracking_id: raise MissingPartnerConfiguration('CHECK24 partner-issued deep link and tracking ID are required')
        parsed=urlparse(self.partner_deep_link)
        if parsed.scheme!='https' or not parsed.netloc: raise ValueError('partner_deep_link must be an HTTPS URL supplied by CHECK24 partner account')
        return self.partner_deep_link
    def get_provider_capabilities(self):
        return ProviderCapabilities('check24',('electricity','gas','internet','mobile'),False,False,True,True,True,True,True,True,False,('Public materials confirm whitelabel comparison calculators and personal direct/deep links including WhatsApp usage.','No public structured tariff-search API schema/auth/rate-limit contract was confirmed.','Energy terms state applicant must submit the application themselves.'))

class DirectProviderAdapter(ProviderAdapter):
    def search_offers(self,request,region=None,need=None): raise MissingPartnerConfiguration('Direct provider integration requires an explicit provider contract/API')
    def get_offer_details(self,provider_offer_id): raise MissingPartnerConfiguration('Direct provider integration requires an explicit provider contract/API')
    def validate_location(self,request): return LocationValidationResult(False,False,'direct_provider_contract_required')
    def normalize_offer(self,raw): raise MissingPartnerConfiguration('Direct provider schema required')
    def get_provider_capabilities(self): return ProviderCapabilities('direct',(),False,False,False,False,False,False,False,True,False,('Provider-specific contract required.',))
