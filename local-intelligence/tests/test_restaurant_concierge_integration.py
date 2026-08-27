import unittest
from dataclasses import replace

from local_intelligence.core import Category, Confidence, OpeningStatus, Place
from local_intelligence.restaurant import AvailabilityStatus, RestaurantCandidate
from local_intelligence.restaurant_concierge import *


def candidate(name="Testo", reservation_url="https://example.test/book"):
    return RestaurantCandidate(
        Place("fixture", "r1", name, Category.RESTAURANT, "Teststr. 1, Berlin", 52.4, 13.3,
              phone="030000", opening_status=OpeningStatus.OPEN_NOW, rating=4.6,
              review_count=120, confidence=Confidence.HIGH),
        cuisines=["italian"], reservation_url=reservation_url,
    )


class RestaurantConciergeIntegrationTests(unittest.TestCase):
    def test_RS1_one_turn_search(self):
        s=merge_sparse_state({}, {"location":"12207","cuisine":"italian","party_size":2,"date":"2026-08-28","time":"19:00"})
        self.assertEqual(missing_slots(s), [])

    def test_RS2_multi_turn(self):
        s={}
        for turn in ({"location":"12207","cuisine":"asian"},{"party_size":2},{"date":"2026-08-28"},{"time":"18:00"}):
            s=merge_sparse_state(s,turn)
        self.assertEqual((s["location"],s["cuisine"],s["party_size"],s["date"],s["time"]),("12207","asian",2,"2026-08-28","18:00"))

    def test_RS3_cuisine_correction(self):
        s=merge_sparse_state({"location":"12207","cuisine":"asian","party_size":2},{"cuisine":"italian"})
        self.assertEqual(s,{"location":"12207","cuisine":"italian","party_size":2})

    def test_RS4_location_correction(self):
        s=merge_sparse_state({"location":"12207","cuisine":"italian"},{"location":"12209"})
        self.assertEqual(s["location"],"12209")

    def test_RS5_time_correction(self):
        s=merge_sparse_state({"time":"18:00","party_size":2},{"time":"18:30"})
        self.assertEqual((s["time"],s["party_size"]),("18:30",2))

    def test_RS6_party_correction_r8(self):
        s=merge_sparse_state({"time":"18:00","party_size":2},{"party_size":4,"time":None})
        self.assertEqual((s["party_size"],s["time"]),(4,"18:00"))

    def test_RS7_preference_add(self):
        s=merge_sparse_state({"preferences":[]},{"preference_add":["vegetarian"]})
        self.assertEqual(s["preferences"],["vegetarian"])

    def test_RS8_preference_remove(self):
        s=merge_sparse_state({"preferences":["vegetarian","quiet"]},{"preference_remove":["vegetarian"]})
        self.assertEqual(s["preferences"],["quiet"])

    def test_RS9_no_reask(self):
        s={"location":"12207","cuisine":"italian","restaurant":"R","party_size":4,"date":"2026-08-28","time":"19:00"}
        self.assertIsNone(no_reask_message(s,for_availability=True))

    def test_RS10_search_results(self):
        x=candidate_summary(candidate())
        self.assertEqual(x["restaurant"],"Testo")
        self.assertEqual(x["availability"],"UNKNOWN")

    def test_RS11_availability(self):
        self.assertEqual(availability_truth(search_found=True,open_at_time=True,provider_status=AvailabilityStatus.AVAILABLE),AvailabilityStatus.AVAILABLE)

    def test_RS12_availability_unknown(self):
        self.assertEqual(availability_truth(search_found=True,open_at_time=True,provider_status=None),AvailabilityStatus.UNKNOWN)

    def test_RS13_approval(self):
        d=approval_requirement(binding_booking=True)
        self.assertTrue(d.required); self.assertFalse(d.elevated)

    def test_RS14_booking(self):
        r=new_reservation("u","R","2026-08-28","19:00",4)
        for s in [ReservationLifecycle.SEARCHING,ReservationLifecycle.RESTAURANT_FOUND,ReservationLifecycle.AWAITING_APPROVAL,ReservationLifecycle.APPROVED,ReservationLifecycle.BOOKING]:
            r=transition(r,s)
        self.assertEqual(r.state,ReservationLifecycle.BOOKING)

    def test_RS15_confirmation(self):
        r=new_reservation("u","R","2026-08-28","19:00",4)
        for s in [ReservationLifecycle.SEARCHING,ReservationLifecycle.RESTAURANT_FOUND,ReservationLifecycle.AWAITING_APPROVAL,ReservationLifecycle.APPROVED,ReservationLifecycle.BOOKING]: r=transition(r,s)
        r=transition(r,ReservationLifecycle.CONFIRMED,provider_booking_id="P1",provider_status="confirmed")
        self.assertEqual((r.state,r.provider_booking_id),(ReservationLifecycle.CONFIRMED,"P1"))

    def test_RS16_timeout(self):
        r=new_reservation("u","R","2026-08-28","19:00",4)
        for s in [ReservationLifecycle.SEARCHING,ReservationLifecycle.RESTAURANT_FOUND,ReservationLifecycle.AWAITING_APPROVAL,ReservationLifecycle.APPROVED,ReservationLifecycle.BOOKING]: r=transition(r,s)
        self.assertEqual(timeout_pending(r).state,ReservationLifecycle.CONFIRMATION_PENDING)

    def test_RS17_retry(self):
        r=new_reservation("u","R","2026-08-28","19:00",4)
        for s in [ReservationLifecycle.SEARCHING,ReservationLifecycle.RESTAURANT_FOUND,ReservationLifecycle.AWAITING_APPROVAL,ReservationLifecycle.APPROVED]: r=transition(r,s)
        self.assertTrue(should_retry_booking(r))
        r=transition(r,ReservationLifecycle.BOOKING)
        self.assertFalse(should_retry_booking(timeout_pending(r)))

    def test_RS18_duplicate_prevention(self):
        a=new_reservation("u","R","2026-08-28","19:00",4)
        b=new_reservation("u","R","2026-08-28","19:00",4)
        self.assertEqual(a.idempotency_key,b.idempotency_key)
        self.assertNotEqual(a.reservation_id,b.reservation_id)

    def test_RS19_modification(self):
        r=new_reservation("u","R","2026-08-28","19:00",4)
        for s in [ReservationLifecycle.SEARCHING,ReservationLifecycle.RESTAURANT_FOUND,ReservationLifecycle.AWAITING_APPROVAL,ReservationLifecycle.APPROVED,ReservationLifecycle.BOOKING,ReservationLifecycle.CONFIRMED]: r=transition(r,s)
        r=modification_requested(r,time="19:30")
        self.assertEqual(r.state,ReservationLifecycle.MODIFICATION_PENDING)
        r=modification_confirmed(r)
        self.assertEqual((r.state,r.time),(ReservationLifecycle.MODIFIED,"19:30"))

    def test_RS20_cancellation(self):
        r=new_reservation("u","R","2026-08-28","19:00",4)
        for s in [ReservationLifecycle.SEARCHING,ReservationLifecycle.RESTAURANT_FOUND,ReservationLifecycle.AWAITING_APPROVAL,ReservationLifecycle.APPROVED,ReservationLifecycle.BOOKING,ReservationLifecycle.CONFIRMED]: r=transition(r,s)
        self.assertEqual(cancellation_confirmed(r).state,ReservationLifecycle.CANCELLED)

    def test_RS21_deposit_guard(self):
        d=approval_requirement(binding_booking=True,deposit=True)
        self.assertTrue(d.required); self.assertTrue(d.elevated)

    def test_RS22_voice_contract(self):
        c=voice_contract(restaurant="R",phone="030",date="2026-08-28",time="19:00",party_size=4,reservation_name="Max",preferences=["quiet"],fallback_windows=["18:30-19:30"])
        self.assertEqual(c.type,"restaurant.reservation_call_request.v1"); self.assertFalse(c.execute)

    def test_RS23_email_contract(self):
        c=email_contract(restaurant="R",email="test@example.test",date="2026-08-28",time="19:00",party_size=4,reservation_name="Max")
        self.assertEqual(c.type,"restaurant.reservation_email_request.v1"); self.assertFalse(c.execute)

    def test_RS24_reminder_contract(self):
        r=ReservationRecord("rid","idem",ReservationLifecycle.CONFIRMED,restaurant="R",date="2026-08-28",time="19:00",party_size=4)
        c=reminder_contract(r,"Adresse")
        self.assertEqual(c.payload["reservation_id"],"rid"); self.assertFalse(c.execute)

    def test_RS25_calendar_contract(self):
        r=ReservationRecord("rid","idem",ReservationLifecycle.CONFIRMED,restaurant="R",date="2026-08-28",time="19:00",party_size=4)
        self.assertEqual(calendar_contract(r,"create_event","Adresse").payload["action"],"create_event")
        r=replace(r,state=ReservationLifecycle.MODIFIED,time="19:30")
        self.assertEqual(calendar_contract(r,"update_event","Adresse").payload["action"],"update_event")
        r=replace(r,state=ReservationLifecycle.CANCELLED)
        self.assertEqual(calendar_contract(r,"cancel_event","Adresse").payload["action"],"cancel_event")

    def test_RS26_human_handoff(self):
        self.assertEqual(choose_reservation_route(RoutingCapabilities()),ReservationRoute.HUMAN)
        self.assertEqual(choose_reservation_route(RoutingCapabilities(phone="030")),ReservationRoute.VOICE)
        self.assertEqual(choose_reservation_route(RoutingCapabilities(api_available=True,phone="030")),ReservationRoute.API)


if __name__=="__main__": unittest.main()
