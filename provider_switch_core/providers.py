from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass
from .models import NormalizedOffer, NeedProfile

class ProviderAdapter(ABC):
    @abstractmethod
    def search_offers(self, product_type: str, region: str, need: NeedProfile) -> list[NormalizedOffer]:
        raise NotImplementedError

@dataclass
class FixtureProviderAdapter(ProviderAdapter):
    fixtures: list[NormalizedOffer]

    def search_offers(self, product_type: str, region: str, need: NeedProfile) -> list[NormalizedOffer]:
        return [o for o in self.fixtures if o.product_type == product_type and o.source == 'TEST_FIXTURE']

class VerivoxAdapter(ProviderAdapter):
    def search_offers(self, product_type: str, region: str, need: NeedProfile) -> list[NormalizedOffer]:
        raise NotImplementedError('No provider credentials or production Verivox integration in Core Engine block')

class Check24Adapter(ProviderAdapter):
    def search_offers(self, product_type: str, region: str, need: NeedProfile) -> list[NormalizedOffer]:
        raise NotImplementedError('CHECK24 is not simulated as an API; link-out/whitelabel integration remains external')

class DirectProviderAdapter(ProviderAdapter):
    def search_offers(self, product_type: str, region: str, need: NeedProfile) -> list[NormalizedOffer]:
        raise NotImplementedError('Direct provider integration requires an explicit provider contract/API')
