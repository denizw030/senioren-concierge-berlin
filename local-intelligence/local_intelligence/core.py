"""NAHWERK Local Intelligence isolated core."""
from __future__ import annotations
from dataclasses import dataclass
from enum import Enum
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2
import re
from urllib.parse import urlparse

class Category(str, Enum):
    PHARMACY="PHARMACY"; RESTAURANT="RESTAURANT"; CAFE="CAFE"; GROCERY="GROCERY"; OPTICIAN="OPTICIAN"; HEARING_AID="HEARING_AID"; MEDICAL_SUPPLY="MEDICAL_SUPPLY"; ELECTRICIAN="ELECTRICIAN"; PLUMBER="PLUMBER"; HEATING="HEATING"; CLEANING="CLEANING"; LOCKSMITH="LOCKSMITH"; COMPUTER_HELP="COMPUTER_HELP"; ELECTRONICS_REPAIR="ELECTRONICS_REPAIR"; HAIRDRESSER="HAIRDRESSER"; FOOT_CARE="FOOT_CARE"; VETERINARIAN="VETERINARIAN"; POST="POST"; PARCEL="PARCEL"; BANK="BANK"; ATM="ATM"; GAS_STATION="GAS_STATION"; AUTO_REPAIR="AUTO_REPAIR"; TAXI="TAXI"; HOTEL="HOTEL"; LEISURE="LEISURE"; GOVERNMENT="GOVERNMENT"
class OpeningStatus(str, Enum):
    OPEN_NOW="OPEN_NOW"; CLOSED_NOW="CLOSED_NOW"; OPENING_SOON="OPENING_SOON"; CLOSING_SOON="CLOSING_SOON"; OPEN_TODAY_LATER="OPEN_TODAY_LATER"; CLOSED_TODAY="CLOSED_TODAY"; UNKNOWN="UNKNOWN"
class Confidence(str, Enum): HIGH="HIGH"; MEDIUM="MEDIUM"; LOW="LOW"; REJECT="REJECT"

@dataclass(frozen=True)
class LocationContext:
    subject_person_id: str|None; source: str|None; latitude: float|None=None; longitude: float|None=None
    accuracy: float|None=None; locality: str|None=None; postal_code: str|None=None; country: str|None=None
    authorized: bool=False; purpose: str="local_search"; obtained_at: datetime|None=None; expires_at: datetime|None=None; ephemeral: bool=True
    def usable(self): return self.authorized and (self.locality is not None or (self.latitude is not None and self.longitude is not None))

@dataclass
class SearchIntent:
    intent:str; category:Category|None; location_target:str; open_now:bool; urgency:str; travel_mode:str; query_text:str
@dataclass
class Place:
    external_provider:str; external_id:str; name:str; category:Category; address:str; latitude:float; longitude:float
    distance:float|None=None; travel_time:float|None=None; phone:str|None=None; website:str|None=None
    opening_status:OpeningStatus=OpeningStatus.UNKNOWN; opening_hours:dict|None=None; rating:float|None=None; review_count:int|None=None
    permanently_closed:bool=False; confidence:Confidence=Confidence.MEDIUM; raw_provider_metadata:dict|None=None; partner:bool=False
@dataclass(frozen=True)
class Destination: lat:float; lng:float; address:str; label:str

CATEGORY_TERMS={"apotheke":Category.PHARMACY,"restaurant":Category.RESTAURANT,"café":Category.CAFE,"cafe":Category.CAFE,"elektriker":Category.ELECTRICIAN,"klempner":Category.PLUMBER,"schlüsseldienst":Category.LOCKSMITH,"bank":Category.BANK,"geldautomat":Category.ATM,"hotel":Category.HOTEL,"taxi":Category.TAXI}
def resolve_query(text:str)->SearchIntent:
    q=text.casefold(); cat=next((v for k,v in CATEGORY_TERMS.items() if k in q),None)
    other=bool(re.search(r"\b(meiner|meinem|bei meiner|bei meinem)\b",q)); m=re.search(r"\b(?:in|bei)\s+([A-ZÄÖÜ][\wÄÖÜäöüß-]+)", text)
    explicit=m.group(1) if m and not other else None
    target="family" if other else ("explicit" if explicit else ("current" if any(x in q for x in ("nähe","hier")) else "unknown"))
    return SearchIntent("place_search",cat,target,any(x in q for x in ("jetzt geöffnet","noch offen","offen jetzt")),"high" if any(x in q for x in ("dringend","sofort","notfall")) else "normal","walking" if "zu fuß" in q else "unspecified",text)

class PlacesProvider:
    def search_places(self, query:SearchIntent, location:LocationContext): raise NotImplementedError
    def get_place_details(self, external_id:str): raise NotImplementedError
    def geocode(self, text:str): raise NotImplementedError
    def reverse_geocode(self, lat:float,lng:float): raise NotImplementedError
    def calculate_distance(self,a,b): return haversine_km(a.latitude,a.longitude,b.latitude,b.longitude)
    def calculate_route(self,a,b,mode="walking"): raise NotImplementedError
class GooglePlacesAdapter(PlacesProvider): pass
class TomTomPlacesAdapter(PlacesProvider): pass
class ProviderError(RuntimeError): pass
class ProviderRateLimit(ProviderError): pass
class FixtureProviderAdapter(PlacesProvider):
    def __init__(self, places=None, failure=None): self.places=list(places or []); self.failure=failure
    def search_places(self, query, location):
        if self.failure=="outage": raise ProviderError("fixture provider unavailable")
        if self.failure=="rate_limit": raise ProviderRateLimit("fixture rate limit")
        return [p for p in self.places if query.category is None or p.category==query.category]
    def get_place_details(self, external_id): return next((p for p in self.places if p.external_id==external_id),None)
    def geocode(self,text): raise NotImplementedError
    def reverse_geocode(self,lat,lng): raise NotImplementedError
    def calculate_route(self,a,b,mode="walking"): return {"distance_km":haversine_km(a.latitude,a.longitude,b.latitude,b.longitude),"travel_minutes":None,"mode":mode}

def haversine_km(a,b,c,d):
    R=6371.0; p1,p2=radians(a),radians(c); dp=radians(c-a); dl=radians(d-b); x=sin(dp/2)**2+cos(p1)*cos(p2)*sin(dl/2)**2
    return R*2*atan2(sqrt(x),sqrt(1-x))
def eligibility(place:Place, category:Category, max_distance_km:float|None=None, require_open=False, require_contact=False):
    if place.permanently_closed or place.category!=category: return False
    if not (-90<=place.latitude<=90 and -180<=place.longitude<=180): return False
    if max_distance_km is not None and (place.distance is None or place.distance>max_distance_km): return False
    if require_open and place.opening_status!=OpeningStatus.OPEN_NOW: return False
    if require_contact and not (place.phone or place.website): return False
    return place.confidence!=Confidence.REJECT
def normalize_phone(x): return re.sub(r"\D","",x or "")
def normalize_domain(x):
    if not x:return ""
    return (urlparse(x if "://" in x else "https://"+x).hostname or "").removeprefix("www.").casefold()
def norm(x): return re.sub(r"\W+","", (x or "").casefold())
def duplicate(a:Place,b:Place):
    if a.external_provider==b.external_provider and a.external_id==b.external_id:return True
    strong=[normalize_phone(a.phone) and normalize_phone(a.phone)==normalize_phone(b.phone),normalize_domain(a.website) and normalize_domain(a.website)==normalize_domain(b.website),norm(a.address) and norm(a.address)==norm(b.address)]
    coord=haversine_km(a.latitude,a.longitude,b.latitude,b.longitude)<0.05
    return sum(bool(x) for x in strong)+(1 if coord else 0)>=2
def deduplicate(places):
    out=[]
    for p in places:
        if not any(duplicate(p,x) for x in out): out.append(p)
    return out
def rank(places, preferences=None):
    pref=preferences or {}
    def score(p):
        distance=max(0,30-(p.distance or 30)*3); opening={OpeningStatus.OPEN_NOW:25,OpeningStatus.OPENING_SOON:15,OpeningStatus.OPEN_TODAY_LATER:8,OpeningStatus.UNKNOWN:0,OpeningStatus.CLOSING_SOON:8,OpeningStatus.CLOSED_NOW:-20,OpeningStatus.CLOSED_TODAY:-25}[p.opening_status]
        quality={Confidence.HIGH:20,Confidence.MEDIUM:10,Confidence.LOW:2,Confidence.REJECT:-100}[p.confidence]; reviews=min(15,(p.review_count or 0)/100)+(p.rating or 0); memory=5 if p.external_id in pref.get("provider_positive_history",[]) else 0
        return distance+opening+quality+reviews+memory
    return sorted(places,key=score,reverse=True)
def senior_output(places):
    labels=["Beste Option","Alternative","Weitere Option"]; out=[]
    for i,p in enumerate(places[:3]):
        opening="Öffnungszeiten unklar" if p.opening_status==OpeningStatus.UNKNOWN else p.opening_status.value.replace("_"," ").title()
        out.append({"position":i+1,"label":labels[i],"name":p.name,"address":p.address,"opening":opening,"phone":p.phone,"website":p.website})
    return out
class MemoryPreferences:
    def __init__(self, preferred_restaurant_style=None,max_walking_minutes=None,preferred_transport=None,provider_positive_history=None): self.data={"preferred_restaurant_style":preferred_restaurant_style,"max_walking_minutes":max_walking_minutes,"preferred_transport":preferred_transport,"provider_positive_history":provider_positive_history or []}
def accept_family_location(location:LocationContext):
    if location.source!="family_authorized_location" or not location.authorized: raise PermissionError("DENY: authorized family location required")
    return location
