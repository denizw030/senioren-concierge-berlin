"""Small deterministic resolver for common German restaurant requests.

This is intentionally conservative: ambiguity remains unset for a higher conversational layer.
"""
from __future__ import annotations
from datetime import date, time
import re
from .restaurant import RestaurantRequest, RankingMode

CUISINES = {
    "italien": "italian", "italienisch": "italian",
    "griech": "greek", "vietnames": "vietnamese", "indisch": "indian",
    "japan": "japanese", "sushi": "japanese", "deutsch": "german",
    "türk": "turkish", "französ": "french", "spanisch": "spanish",
}
PARTY_WORDS = {"einen":1,"eine":1,"eins":1,"zwei":2,"drei":3,"vier":4,"fünf":5,"sechs":6,"sieben":7,"acht":8}

def resolve_restaurant_request(text: str, actor_person_id: str, subject_person_id: str, location_context, today: date) -> RestaurantRequest:
    q = text.casefold()
    requested_date = today if "heute" in q or "heute abend" in q else None
    tm = re.search(r"\b(?:um\s*)?(\d{1,2})(?::(\d{2}))?\s*(?:uhr)?\b", q)
    requested_time = None
    if tm:
        h=int(tm.group(1)); m=int(tm.group(2) or 0)
        if 0 <= h <= 23 and 0 <= m <= 59: requested_time=time(h,m)
    party_size = None
    pm = re.search(r"\bfür\s+(\d{1,2}|einen|eine|eins|zwei|drei|vier|fünf|sechs|sieben|acht)(?:\s+personen?)?\b", q)
    if pm:
        raw=pm.group(1); party_size=int(raw) if raw.isdigit() else PARTY_WORDS.get(raw)
    cuisines=[]
    for needle,cuisine in CUISINES.items():
        if needle in q and cuisine not in cuisines: cuisines.append(cuisine)
    min_rating=None
    rm=re.search(r"(?:mindestens|min\.?)[^\d]*(\d(?:[\.,]\d)?)\s*(?:sterne?)?",q)
    if rm: min_rating=float(rm.group(1).replace(",","."))
    max_distance=None
    dm=re.search(r"(?:maximal|max\.?|höchstens)\s*(\d+(?:[\.,]\d+)?)\s*(km|kilometer|m|meter)\b",q)
    if dm:
        value=float(dm.group(1).replace(",",".")); max_distance=value/1000 if dm.group(2) in ("m","meter") else value
    max_travel=None
    mm=re.search(r"(?:maximal|max\.?|höchstens)\s*(\d+)\s*min(?:uten)?\b",q)
    if mm: max_travel=float(mm.group(1))
    if any(x in q for x in ("eines der besten","eines von den besten","besten restaurant","bestes restaurant")):
        ranking=RankingMode.BEST_RATED
    elif "entfernung ist nicht so wichtig" in q or "entfernung egal" in q:
        ranking=RankingMode.BEST_RATED
    elif any(x in q for x in ("passend","passt zu mir","für mich passend")):
        ranking=RankingMode.MEMORY_PERSONALIZED
    elif any(x in q for x in ("günstig","preiswert","preisbewusst")):
        ranking=RankingMode.PRICE_CONSCIOUS
    else:
        ranking=RankingMode.BEST_MATCH
    reservation_intent=any(x in q for x in ("reservier","buche einen tisch","tisch buchen"))
    explicit_auto=reservation_intent and any(x in q for x in ("wenn was frei","wenn etwas frei","wenn frei","reserviere direkt","reservier direkt"))
    return RestaurantRequest(
        actor_person_id=actor_person_id, subject_person_id=subject_person_id,
        location_context=location_context, date=requested_date, time=requested_time,
        party_size=party_size, cuisine_preferences=cuisines, min_rating=min_rating,
        max_distance=max_distance, max_travel_time=max_travel, ranking_mode=ranking,
        reservation_intent=reservation_intent, explicit_auto_reserve=explicit_auto,
        request_text=text,
    )
