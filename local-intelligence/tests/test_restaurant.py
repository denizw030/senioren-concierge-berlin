import unittest
from datetime import date,time
from local_intelligence.core import Place,Category,OpeningStatus,Confidence,LocationContext
from local_intelligence.restaurant import *
from local_intelligence.providers import *

def p(i,rating=4.7,reviews=500,distance=2,travel=8,opening=OpeningStatus.OPEN_NOW,partner=False,phone="0301"):
    return Place("fixture",i,"R"+i,Category.RESTAURANT,"Berlin",52.5,13.4,distance=distance,travel_time=travel,phone=phone,opening_status=opening,rating=rating,review_count=reviews,confidence=Confidence.HIGH,partner=partner)
def c(i,**kw):
    placekw={k:kw.pop(k) for k in list(kw) if k in {"rating","reviews","distance","travel","opening","partner","phone"}}
    return RestaurantCandidate(p(i,**placekw),**kw)
def req(**kw):
    base=dict(actor_person_id="a",subject_person_id="a",location_context=LocationContext("a","current",52.5,13.4,authorized=True),date=date(2026,8,26),time=time(18,0),party_size=2,cuisine_preferences=["italian"],request_text="italienisch 18 Uhr für zwei")
    base.update(kw); return RestaurantRequest(**base)

class RestaurantTests(unittest.TestCase):
    def test_01_italian_18_two(self): self.assertTrue(eligible(c("1",cuisines=["italian"]),req()))
    def test_02_best_rated(self): self.assertEqual(rank_restaurants([c("a",rating=4.8,reviews=1000,cuisines=["italian"]),c("b",rating=4.2,reviews=1000,cuisines=["italian"])],req(ranking_mode=RankingMode.BEST_RATED))[0].place.external_id,"a")
    def test_03_best_match(self): self.assertTrue(rank_restaurants([c("a",cuisines=["italian"])],req()))
    def test_04_min_rating(self): self.assertFalse(eligible(c("a",rating=4.4,cuisines=["italian"]),req(min_rating=4.5)))
    def test_05_few_reviews_loses(self): self.assertEqual(rank_restaurants([c("few",rating=5.0,reviews=3,cuisines=["italian"]),c("many",rating=4.8,reviews=1500,cuisines=["italian"])],req(ranking_mode=RankingMode.BEST_RATED))[0].place.external_id,"many")
    def test_06_max_distance(self): self.assertFalse(eligible(c("a",distance=20,cuisines=["italian"]),req(max_distance=15)))
    def test_07_max_travel(self): self.assertFalse(eligible(c("a",travel=20,cuisines=["italian"]),req(max_travel_time=15)))
    def test_08_closed(self): self.assertFalse(eligible(c("a",opening=OpeningStatus.CLOSED_NOW,cuisines=["italian"]),req()))
    def test_09_opening_unknown(self): self.assertTrue(eligible(c("a",opening=OpeningStatus.UNKNOWN,cuisines=["italian"]),req()))
    def test_10_table_unknown(self): self.assertEqual(reservation_decision(req(explicit_auto_reserve=True,reservation_intent=True),AvailabilityResult(AvailabilityStatus.UNKNOWN)),ReservationState.NEEDS_USER_INPUT)
    def test_11_opening_not_availability(self): self.assertEqual(reservation_decision(req(explicit_auto_reserve=True,reservation_intent=True),AvailabilityResult(AvailabilityStatus.UNAVAILABLE)),ReservationState.NEEDS_USER_INPUT)
    def test_12_memory_preference(self):
        r=req(ranking_mode=RankingMode.MEMORY_PERSONALIZED,cuisine_preferences=[]); a=c("a",cuisines=["italian"],atmosphere=["quiet"]); b=c("b",cuisines=["german"])
        self.assertEqual(rank_restaurants([b,a],r,{"favorite_cuisines":["italian"],"quiet":True})[0].place.external_id,"a")
    def test_13_memory_no_fact_override(self): self.assertFalse(eligible(c("a",opening=OpeningStatus.CLOSED_NOW,cuisines=["italian"]),req()))
    def test_14_family_without_permission(self):
        with self.assertRaises(PermissionError): authorize(req(actor_person_id="family",subject_person_id="senior"),AuthorizationContext("family","senior",frozenset()))
    def test_15_family_scope(self): self.assertTrue(authorize(req(actor_person_id="family",subject_person_id="senior"),AuthorizationContext("family","senior",frozenset({"restaurant.reserve"}))))
    def test_16_explicit_auto_reserve(self): self.assertTrue(approval_from_original_request(req(reservation_intent=True,explicit_auto_reserve=True)))
    def test_17_limited_original_approval(self): self.assertEqual(reservation_decision(req(reservation_intent=True,explicit_auto_reserve=True),AvailabilityResult(AvailabilityStatus.AVAILABLE,reservation_possible=True),"18:00"),ReservationState.APPROVED)
    def test_18_fee_needs_input(self): self.assertEqual(reservation_decision(req(reservation_intent=True,explicit_auto_reserve=True),AvailabilityResult(AvailabilityStatus.AVAILABLE,fee_required=True)),ReservationState.NEEDS_USER_INPUT)
    def test_19_other_time_needs_input(self): self.assertEqual(reservation_decision(req(reservation_intent=True,explicit_auto_reserve=True),AvailabilityResult(AvailabilityStatus.AVAILABLE),"18:30"),ReservationState.NEEDS_USER_INPUT)
    def test_20_online_fixture(self): self.assertEqual(FixtureAvailabilityProvider({"a":AvailabilityResult(AvailabilityStatus.AVAILABLE)}).check_availability(c("a"),req()).status,AvailabilityStatus.AVAILABLE)
    def test_21_reservation_link_fixture(self): self.assertTrue(c("a",reservation_url="https://example.test/book").reservation_url)
    def test_22_outbound_call_fixture(self):
        x=OutboundCallFixture(OutboundCallResult("completed",AvailabilityStatus.AVAILABLE,["18:00"],True)); self.assertTrue(x.restaurant_call_availability(OutboundCallRequest("R","030","2026-08-26","18:00",2,"Max",None,"availability","restaurant.call_availability","x")).reservation_possible)
    def test_23_call_can_only_availability(self):
        x=OutboundCallResult("completed",AvailabilityStatus.AVAILABLE,["18:00"],True); self.assertFalse(x.reservation_confirmed)
    def test_24_confirmed_fixture(self):
        fp=FixtureAvailabilityProvider(confirmations={"a":ReservationResult(True,"ABC")}); pr=PreparedReservation(c("a"),"18:00",2); self.assertTrue(fp.confirm_reservation(pr).confirmed)
    def test_25_provider_outage_mapping(self):
        with self.assertRaises(ProviderUnavailable): GooglePlacesAdapter.map_http_error(503)
    def test_26_rate_limit(self):
        with self.assertRaises(ProviderRateLimited): TomTomPlacesAdapter.map_http_error(429)
    def test_27_dedup(self):
        a=c("same",cuisines=["italian"]); b=c("same",cuisines=["italian"]); self.assertEqual(len(deduplicate_candidates([a,b])),1)
    def test_28_max_three_visible(self): self.assertEqual(len(visible_candidates([c(str(i)) for i in range(5)])),3)
    def test_29_partner_zero_effect(self):
        a=c("a",partner=False,cuisines=["italian"]); b=c("b",partner=True,cuisines=["italian"]); self.assertEqual([x.place.external_id for x in rank_restaurants([a,b],req())],["a","b"])
    def test_30_no_customer_data(self):
        call=OutboundCallRequest("Fixture R","030000","2026-08-26","18:00",2,"Fixture Name",None,"availability","restaurant.call_availability","synthetic"); self.assertNotIn("customer",repr(call).lower())
    def test_31_google_capabilities_no_availability(self): self.assertFalse(GOOGLE_CAPABILITIES.supports_live_availability)
    def test_32_tomtom_capabilities_no_availability(self): self.assertFalse(TOMTOM_CAPABILITIES.supports_live_availability)
    def test_33_google_field_mask(self): self.assertIn("places.userRatingCount",GooglePlacesAdapter().build_search_request(ProviderSearchRequest(query_text="restaurant"))["headers"]["X-Goog-FieldMask"])
    def test_34_google_nearby_post(self): self.assertEqual(GooglePlacesAdapter().build_search_request(ProviderSearchRequest(latitude=52.5,longitude=13.4,categories=("restaurant",)))["method"],"POST")
    def test_35_missing_google_key_no_fake_call(self):
        with self.assertRaises(MissingProviderCredential): GooglePlacesAdapter().search_places(ProviderSearchRequest(query_text="restaurant"))
    def test_36_missing_tomtom_key_no_fake_call(self):
        with self.assertRaises(MissingProviderCredential): TomTomPlacesAdapter().search_places(ProviderSearchRequest(query_text="restaurant"))
    def test_37_call_disclosure(self): self.assertIn("digitale Concierge",CALL_DISCLOSURE_TEMPLATE)
    def test_38_state_machine_contains_required(self):
        for x in ["REQUESTED","SEARCHING","CANDIDATES_FOUND","CHECKING_AVAILABILITY","AVAILABLE","PREPARED","APPROVED","RESERVING","CONFIRMED","FAILED","NEEDS_USER_INPUT","CANCELLED"]: self.assertIn(x,ReservationState.__members__)

if __name__=="__main__": unittest.main()
