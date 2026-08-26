"""Pure response mappers. They contain no network transport or persistence."""
from __future__ import annotations
from .core import Place, Category, OpeningStatus, Confidence
from .providers import InvalidProviderResponse

GOOGLE_TYPE_MAP = {
    "restaurant": Category.RESTAURANT,
    "cafe": Category.CAFE,
    "pharmacy": Category.PHARMACY,
    "supermarket": Category.GROCERY,
    "bank": Category.BANK,
    "atm": Category.ATM,
    "gas_station": Category.GAS_STATION,
    "lodging": Category.HOTEL,
}

def _google_opening(payload: dict) -> OpeningStatus:
    current = payload.get("currentOpeningHours") or {}
    value = current.get("openNow")
    if value is True: return OpeningStatus.OPEN_NOW
    if value is False: return OpeningStatus.CLOSED_NOW
    return OpeningStatus.UNKNOWN

def map_google_place(payload: dict, fallback_category: Category | None = None) -> Place:
    try:
        external_id = payload.get("id") or str(payload.get("name", "")).removeprefix("places/")
        display = payload.get("displayName") or {}
        name = display.get("text") if isinstance(display, dict) else str(display)
        loc = payload["location"]
        if not external_id or not name:
            raise KeyError("missing id/displayName")
        provider_type = payload.get("primaryType") or next(iter(payload.get("types") or []), None)
        category = GOOGLE_TYPE_MAP.get(provider_type, fallback_category)
        if category is None: raise KeyError("unmapped category")
        phone = payload.get("internationalPhoneNumber") or payload.get("nationalPhoneNumber")
        return Place(
            "google_places_new", external_id, name, category,
            payload.get("formattedAddress", ""), float(loc["latitude"]), float(loc["longitude"]),
            phone=phone, website=payload.get("websiteUri"), opening_status=_google_opening(payload),
            opening_hours=payload.get("currentOpeningHours") or payload.get("regularOpeningHours"),
            rating=float(payload["rating"]) if payload.get("rating") is not None else None,
            review_count=int(payload["userRatingCount"]) if payload.get("userRatingCount") is not None else None,
            permanently_closed=payload.get("businessStatus") == "CLOSED_PERMANENTLY",
            confidence=Confidence.HIGH,
            raw_provider_metadata={"primary_type": provider_type, "resource_name": payload.get("name")},
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise InvalidProviderResponse(f"invalid Google Places response: {exc}") from exc

TOMTOM_CATEGORY_MAP = {
    "RESTAURANT": Category.RESTAURANT,
    "CAFE_PUB": Category.CAFE,
    "PHARMACY": Category.PHARMACY,
    "SUPERMARKET": Category.GROCERY,
    "BANK": Category.BANK,
    "ATM": Category.ATM,
    "PETROL_STATION": Category.GAS_STATION,
    "HOTEL_MOTEL": Category.HOTEL,
}

def map_tomtom_place(payload: dict, fallback_category: Category | None = None) -> Place:
    try:
        poi = payload.get("poi") or {}
        position = payload["position"]
        external_id = payload["id"]
        name = poi["name"]
        classifications = poi.get("classifications") or []
        code = None
        if classifications:
            code = (classifications[0].get("code") or "").upper()
        category = TOMTOM_CATEGORY_MAP.get(code, fallback_category)
        if category is None: raise KeyError("unmapped category")
        address = payload.get("address") or {}
        formatted = address.get("freeformAddress") or address.get("streetName") or ""
        phone = poi.get("phone")
        website = poi.get("url")
        opening_hours = poi.get("openingHours")
        return Place(
            "tomtom_search", str(external_id), str(name), category, str(formatted),
            float(position["lat"]), float(position["lon"]), phone=phone, website=website,
            opening_status=OpeningStatus.UNKNOWN, opening_hours=opening_hours,
            confidence=Confidence.MEDIUM,
            raw_provider_metadata={"classification_code": code},
        )
    except (KeyError, TypeError, ValueError) as exc:
        raise InvalidProviderResponse(f"invalid TomTom response: {exc}") from exc
