"""Credential-free provider contracts for Google Places (New) and TomTom."""
from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from typing import Any

class ProviderUnavailable(RuntimeError): pass
class ProviderRateLimited(RuntimeError): pass
class InvalidProviderResponse(RuntimeError): pass
class ProviderTimeout(RuntimeError): pass
class MissingProviderCredential(RuntimeError): pass

@dataclass(frozen=True)
class ProviderCapabilities:
    supports_text_search: bool
    supports_nearby_search: bool
    supports_details: bool
    supports_opening_hours: bool
    supports_phone: bool
    supports_website: bool
    supports_ratings: bool
    supports_geocoding: bool
    supports_routing: bool
    supports_live_availability: bool = False

GOOGLE_CAPABILITIES = ProviderCapabilities(True, True, True, True, True, True, True, True, True, False)
TOMTOM_CAPABILITIES = ProviderCapabilities(True, True, True, True, True, True, False, True, True, False)

GOOGLE_SEARCH_FIELDS = (
    "places.id,places.name,places.displayName,places.formattedAddress,places.location,"
    "places.primaryType,places.types,places.businessStatus,places.currentOpeningHours,"
    "places.regularOpeningHours,places.rating,places.userRatingCount,"
    "places.nationalPhoneNumber,places.internationalPhoneNumber,places.websiteUri,places.priceLevel"
)
GOOGLE_DETAILS_FIELDS = (
    "id,name,displayName,formattedAddress,location,primaryType,types,businessStatus,"
    "currentOpeningHours,regularOpeningHours,rating,userRatingCount,nationalPhoneNumber,"
    "internationalPhoneNumber,websiteUri,priceLevel"
)

@dataclass(frozen=True)
class ProviderSearchRequest:
    query_text: str | None = None
    latitude: float | None = None
    longitude: float | None = None
    radius_m: float | None = None
    categories: tuple[str, ...] = ()
    language_code: str = "de"
    region_code: str = "DE"
    open_now: bool = False
    max_results: int = 20

@dataclass(frozen=True)
class RouteRequest:
    origin_lat: float
    origin_lng: float
    destination_lat: float
    destination_lng: float
    travel_mode: str = "DRIVE"

class BasePreparedAdapter:
    provider_name = "base"
    capabilities: ProviderCapabilities
    def __init__(self, api_key: str | None = None, timeout_seconds: float = 5.0):
        self._api_key = api_key
        self.timeout_seconds = timeout_seconds
    def _require_key(self):
        if not self._api_key:
            raise MissingProviderCredential(f"{self.provider_name} API key not configured")
    @staticmethod
    def map_http_error(status: int, body: Any = None):
        if status == 429:
            raise ProviderRateLimited("provider rate limited")
        if status in (408, 504):
            raise ProviderTimeout("provider timeout")
        if status >= 500:
            raise ProviderUnavailable("provider unavailable")
        if status >= 400:
            raise InvalidProviderResponse(f"provider rejected request: HTTP {status}")

class GooglePlacesAdapter(BasePreparedAdapter):
    provider_name = "google_places_new"
    capabilities = GOOGLE_CAPABILITIES
    base_url = "https://places.googleapis.com/v1"
    def build_search_request(self, req: ProviderSearchRequest) -> dict:
        if req.query_text:
            body = {"textQuery": req.query_text, "languageCode": req.language_code, "regionCode": req.region_code, "pageSize": min(req.max_results, 20)}
            if req.open_now: body["openNow"] = True
            if req.categories: body["includedType"] = req.categories[0]
            if req.latitude is not None and req.longitude is not None:
                radius = float(req.radius_m or 5000)
                body["locationBias"] = {"circle": {"center": {"latitude": req.latitude, "longitude": req.longitude}, "radius": radius}}
            return {"method":"POST","url":f"{self.base_url}/places:searchText","headers":{"X-Goog-FieldMask":GOOGLE_SEARCH_FIELDS},"json":body}
        if req.latitude is None or req.longitude is None:
            raise ValueError("nearby search requires coordinates")
        body = {"maxResultCount": min(req.max_results, 20), "languageCode": req.language_code,
                "locationRestriction":{"circle":{"center":{"latitude":req.latitude,"longitude":req.longitude},"radius":float(req.radius_m or 5000)}}}
        if req.categories: body["includedTypes"] = list(req.categories)
        return {"method":"POST","url":f"{self.base_url}/places:searchNearby","headers":{"X-Goog-FieldMask":GOOGLE_SEARCH_FIELDS},"json":body}
    def build_details_request(self, external_id: str) -> dict:
        place_id = external_id.removeprefix("places/")
        return {"method":"GET","url":f"{self.base_url}/places/{place_id}","headers":{"X-Goog-FieldMask":GOOGLE_DETAILS_FIELDS}}
    def search_places(self, request: ProviderSearchRequest): self._require_key(); raise ProviderUnavailable("live transport deliberately not wired")
    def get_place_details(self, external_id: str): self._require_key(); raise ProviderUnavailable("live transport deliberately not wired")
    def geocode(self, query: str): self._require_key(); raise ProviderUnavailable("live geocoding transport deliberately not wired")
    def reverse_geocode(self, lat: float, lng: float): self._require_key(); raise ProviderUnavailable("live geocoding transport deliberately not wired")
    def calculate_distance(self, a, b):
        from .core import haversine_km
        return haversine_km(a.latitude,a.longitude,b.latitude,b.longitude)
    def calculate_route(self, request: RouteRequest): self._require_key(); raise ProviderUnavailable("live routes transport deliberately not wired")

class TomTomPlacesAdapter(BasePreparedAdapter):
    provider_name = "tomtom_search"
    capabilities = TOMTOM_CAPABILITIES
    search_base = "https://api.tomtom.com/search/2"
    routing_base = "https://api.tomtom.com/routing/1"
    def build_search_request(self, req: ProviderSearchRequest) -> dict:
        if req.query_text:
            return {"method":"GET","url":f"{self.search_base}/search/{req.query_text}.json","params":{"lat":req.latitude,"lon":req.longitude,"radius":req.radius_m,"limit":min(req.max_results,100),"language":req.language_code}}
        if req.latitude is None or req.longitude is None:
            raise ValueError("nearby search requires coordinates")
        return {"method":"GET","url":f"{self.search_base}/nearbySearch/.json","params":{"lat":req.latitude,"lon":req.longitude,"radius":req.radius_m or 5000,"limit":min(req.max_results,100),"language":req.language_code}}
    def build_geocode_request(self, query: str) -> dict:
        return {"method":"GET","url":f"{self.search_base}/geocode/{query}.json","params":{}}
    def build_reverse_geocode_request(self, lat: float, lng: float) -> dict:
        return {"method":"GET","url":f"{self.search_base}/reverseGeocode/{lat},{lng}.json","params":{}}
    def build_route_request(self, req: RouteRequest) -> dict:
        return {"method":"GET","url":f"{self.routing_base}/calculateRoute/{req.origin_lat},{req.origin_lng}:{req.destination_lat},{req.destination_lng}/json","params":{"travelMode":req.travel_mode.lower(),"traffic":"true"}}
    def search_places(self, request: ProviderSearchRequest): self._require_key(); raise ProviderUnavailable("live transport deliberately not wired")
    def get_place_details(self, external_id: str): self._require_key(); raise ProviderUnavailable("live transport deliberately not wired")
    def geocode(self, query: str): self._require_key(); raise ProviderUnavailable("live geocoding transport deliberately not wired")
    def reverse_geocode(self, lat: float, lng: float): self._require_key(); raise ProviderUnavailable("live geocoding transport deliberately not wired")
    def calculate_distance(self, a, b):
        from .core import haversine_km
        return haversine_km(a.latitude,a.longitude,b.latitude,b.longitude)
    def calculate_route(self, request: RouteRequest): self._require_key(); raise ProviderUnavailable("live routes transport deliberately not wired")
