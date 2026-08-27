import unittest
from dataclasses import replace
from datetime import date,time

from local_intelligence.core import Category,Confidence,OpeningStatus,Place
from local_intelligence.restaurant import AvailabilityStatus,RestaurantCandidate,RestaurantRequest
from local_intelligence.restaurant_execution import *


def raw(name="Roma",eid="r1",rating=4.6,distance=1.2,url="https://example.test/book",phone=None,address=None):
    suffix=sum(map(ord,eid)); phone=phone or f"030{suffix}"; address=address or f"Teststr. {eid}"
    lat=52.40+(suffix%20)/10000; lon=13.30+(suffix%20)/10000
    return RestaurantCandidate(Place("fixture",eid,name,Category.RESTAURANT,address,lat,lon,phone=phone,opening_status=OpeningStatus.OPEN_NOW,rating=rating,review_count=100,confidence=Confidence.HIGH,distance=distance),cuisines=["italian"],reservation_url=url)
def req(min_rating=4.0): return RestaurantRequest("u","u","12207",date=date(2026,8,29),time=time(19,0),party_size=4,cuisine_preferences=["italian"],min_rating=min_rating,reservation_intent=True,explicit_auto_reserve=True)
def job(window=("18:30","20:00"),limits=None): return create_job(account_id="a",member_ref="m",tenant_id="t",criteria={"location":"12207","cuisine":"italian","date":"2026-08-29","time":"19:00","party_size":4,"minimum_rating":4.0},constraints={"allowed_time_window":window},limits=limits)
def candidates(*items): return build_candidates(list(items),req(),max_candidates=5)
def loaded(*items,window=("18:30","20:00"),limits=None):
    j=job(window,limits); set_candidates(j,candidates(*items)); return j

def approve(j): set_approval(j,True); return j

class EOTests(unittest.TestCase):
    def test_EO1_one_turn_job(self): j=job(); self.assertEqual(j.status,JobState.CREATED); self.assertTrue(j.reservation_id)
    def test_EO2_multi_turn_job(self): j=job(); j.criteria.update({"preferences":["quiet"]}); self.assertEqual(j.criteria["party_size"],4)
    def test_EO3_search(self): self.assertEqual(loaded(raw()).status,JobState.CANDIDATES_FOUND)
    def test_EO4_rating_filter(self): self.assertEqual([x.restaurant_name for x in candidates(raw("Bad","b",3.9),raw("Good","g",4.3))],["Good"])
    def test_EO5_ranking(self): self.assertEqual(candidates(raw("Near","n",4.5,.5),raw("Far","f",4.5,10))[0].restaurant_name,"Near")
    def test_EO6_candidate_dedupe(self): self.assertEqual(len(candidates(raw(),raw())),1)
    def test_EO7_online_first(self): self.assertEqual(online_first_channel(candidates(raw())[0]),AttemptChannel.ONLINE)
    def test_EO8_availability_available(self): j=loaded(raw()); register_availability(j,AvailabilityStatus.AVAILABLE); self.assertEqual(current_candidate(j).availability_state,AvailabilityStatus.AVAILABLE)
    def test_EO9_availability_unavailable(self): j=loaded(raw()); register_availability(j,AvailabilityStatus.UNAVAILABLE); self.assertEqual(current_candidate(j).availability_state,AvailabilityStatus.UNAVAILABLE)
    def test_EO10_availability_unknown(self): self.assertEqual(current_candidate(loaded(raw())).availability_state,AvailabilityStatus.UNKNOWN)
    def test_EO11_approval(self): self.assertTrue(needs_approval(binding=True).required)
    def test_EO12_online_booking_confirmed(self):
        j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); transition_job(j,JobState.WAITING_APPROVAL); approve(j); transition_job(j,JobState.BOOKING_ONLINE); confirm(j,provider_reference="P1"); self.assertEqual(j.status,JobState.CONFIRMED)
    def test_EO13_online_booking_failure(self): j=loaded(raw("A","a"),raw("B","b")); transition_job(j,JobState.CHECKING_ONLINE); transition_job(j,JobState.BOOKING_ONLINE); self.assertEqual(try_next(j,reason="provider_failed"),"NEXT")
    def test_EO14_voice_fallback(self): j=loaded(raw(url=None)); transition_job(j,JobState.CALLING); c=voice_fallback_contract(j,"Max"); self.assertEqual(c.type,"restaurant.reservation_call_request.v1"); self.assertFalse(c.execute)
    def test_EO15_no_answer(self): j=loaded(raw("A","a",url=None),raw("B","b",url=None)); transition_job(j,JobState.CALLING); self.assertEqual(handle_call_result(j,CallResult.NO_ANSWER),"NEXT")
    def test_EO16_busy(self): j=loaded(raw("A","a",url=None),raw("B","b",url=None)); transition_job(j,JobState.CALLING); self.assertEqual(handle_call_result(j,CallResult.BUSY),"NEXT")
    def test_EO17_next_candidate(self): j=loaded(raw("A","a"),raw("B","b")); transition_job(j,JobState.CHECKING_ONLINE); self.assertEqual(try_next(j,reason="x"),"NEXT"); self.assertEqual(current_candidate(j).restaurant_name,"B")
    def test_EO18_multiple_failures(self): j=loaded(raw("A","a"),raw("B","b")); transition_job(j,JobState.CHECKING_ONLINE); try_next(j,reason="x"); transition_job(j,JobState.CHECKING_ONLINE); self.assertEqual(try_next(j,reason="y"),"HANDOFF")
    def test_EO19_alternative_within_window(self): j=loaded(raw(url=None)); transition_job(j,JobState.CALLING); self.assertEqual(handle_call_result(j,CallResult.ALTERNATIVE_OFFERED,offered_time="19:30"),"ACCEPTABLE_ALTERNATIVE"); self.assertEqual(j.criteria["time"],"19:30")
    def test_EO20_alternative_outside_window(self): j=loaded(raw(url=None)); transition_job(j,JobState.CALLING); self.assertEqual(handle_call_result(j,CallResult.ALTERNATIVE_OFFERED,offered_time="21:00"),"WAITING_CUSTOMER")
    def test_EO21_customer_input(self): j=loaded(raw(url=None)); transition_job(j,JobState.CALLING); handle_call_result(j,CallResult.ALTERNATIVE_OFFERED,offered_time="21:00"); self.assertEqual(j.status,JobState.WAITING_CUSTOMER)
    def test_EO22_retry(self): j=loaded(raw(url=None)); transition_job(j,JobState.CALLING); a=begin_attempt(j,AttemptChannel.VOICE); j.attempts[j.attempts.index(a)]=replace(a,state=AttemptState.FAILED); b=begin_attempt(j,AttemptChannel.VOICE); self.assertNotEqual(a.attempt_id,b.attempt_id)
    def test_EO23_retry_limit(self):
        j=loaded(raw(url=None),limits=ExecutionLimits(per_candidate_retry_limit=1)); transition_job(j,JobState.CALLING)
        for _ in range(2): a=begin_attempt(j,AttemptChannel.VOICE); j.attempts[j.attempts.index(a)]=replace(a,state=AttemptState.FAILED)
        with self.assertRaises(RuntimeError): begin_attempt(j,AttemptChannel.VOICE)
    def test_EO24_duplicate_execution(self): j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); a=begin_attempt(j,AttemptChannel.ONLINE); b=begin_attempt(j,AttemptChannel.ONLINE); self.assertEqual(a.attempt_id,b.attempt_id)
    def test_EO25_confirmation_pending(self): j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); a=begin_attempt(j,AttemptChannel.ONLINE); mark_confirmation_pending(j,a); self.assertEqual(j.status,JobState.CONFIRMATION_PENDING)
    def test_EO26_provider_reconciliation(self): j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); a=begin_attempt(j,AttemptChannel.ONLINE); mark_confirmation_pending(j,a); approve(j); self.assertEqual(reconcile_provider(j,confirmed=True,provider_booking_id="P2"),"CONFIRMED")
    def test_EO27_success_stops_further_attempts(self):
        j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); approve(j); transition_job(j,JobState.BOOKING_ONLINE); confirm(j,provider_reference="P")
        with self.assertRaises(RuntimeError): begin_attempt(j,AttemptChannel.ONLINE)
    def test_EO28_deposit_guard(self): d=needs_approval(binding=True,deposit=True); self.assertTrue(d.required and d.elevated)
    def test_EO29_human_handoff(self): j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); self.assertEqual(try_next(j,reason="x"),"HANDOFF"); self.assertEqual(handoff_contract(j).type,"restaurant.human_handoff_request.v1")
    def test_EO30_resume_from_handoff(self): j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); try_next(j,reason="x"); resume_from_handoff(j,{"action":"expand_search","allowed_radius":5}); self.assertEqual((j.status,j.allowed_radius),(JobState.SEARCHING,5.0))
    def test_EO31_email_fallback(self): j=loaded(raw()); j.candidate_list[0]=replace(j.candidate_list[0],email="r@example.test"); self.assertFalse(email_fallback_contract(j,"Max").execute)
    def test_EO32_reminder(self): j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); approve(j); transition_job(j,JobState.BOOKING_ONLINE); confirm(j,provider_reference="P"); self.assertIn("reminder",followup_contracts(j)[0].type)
    def test_EO33_calendar(self): j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); approve(j); transition_job(j,JobState.BOOKING_ONLINE); confirm(j,provider_reference="P"); self.assertEqual(followup_contracts(j)[1].payload["action"],"create_event")
    def test_EO34_failure_result(self): j=loaded(raw()); transition_job(j,JobState.CHECKING_ONLINE); try_next(j,reason="unavailable"); self.assertEqual(customer_result(j)["status"],"not_confirmed")
    def test_EO35_tenant_isolation(self):
        j=job(); tenant_guard(j,tenant_id="t",account_id="a")
        with self.assertRaises(PermissionError): tenant_guard(j,tenant_id="wrong",account_id="a")
    def test_EO36_cost_attempt_limits(self):
        j=loaded(raw(url=None),limits=ExecutionLimits(max_calls=1)); transition_job(j,JobState.CALLING); a=begin_attempt(j,AttemptChannel.VOICE); j.attempts[j.attempts.index(a)]=replace(a,state=AttemptState.FAILED)
        with self.assertRaises(RuntimeError): begin_attempt(j,AttemptChannel.VOICE)
    def test_EO37_full_synthetic_e2e(self):
        j=loaded(raw("A","a"),raw("B","b",url=None),raw("C","c",url=None)); transition_job(j,JobState.CHECKING_ONLINE); register_availability(j,AvailabilityStatus.UNAVAILABLE); self.assertEqual(try_next(j,reason="UNAVAILABLE"),"NEXT")
        transition_job(j,JobState.CHECKING_ONLINE); register_availability(j,AvailabilityStatus.UNKNOWN); transition_job(j,JobState.CALLING); self.assertEqual(handle_call_result(j,CallResult.NO_ANSWER),"NEXT")
        transition_job(j,JobState.CALLING); self.assertEqual(handle_call_result(j,CallResult.ALTERNATIVE_OFFERED,offered_time="19:30"),"ACCEPTABLE_ALTERNATIVE"); approve(j); confirm(j,provider_reference="VOICE-C")
        self.assertEqual(j.status,JobState.CONFIRMED); r,c=followup_contracts(j); self.assertEqual(customer_result(j)["time"],"19:30"); self.assertFalse(r.execute); self.assertFalse(c.execute)
    def test_handoff_resume_e2e(self):
        j=loaded(raw("A","a"),raw("B","b"),raw("C","c")); transition_job(j,JobState.CHECKING_ONLINE); try_next(j,reason="x"); transition_job(j,JobState.CHECKING_ONLINE); try_next(j,reason="x"); transition_job(j,JobState.CHECKING_ONLINE); self.assertEqual(try_next(j,reason="x"),"HANDOFF")
        resume_from_handoff(j,{"action":"expand_search","allowed_radius":5}); set_candidates(j,candidates(raw("D","d"))); transition_job(j,JobState.CHECKING_ONLINE); approve(j); transition_job(j,JobState.BOOKING_ONLINE); confirm(j,provider_reference="D1"); self.assertEqual(customer_result(j)["restaurant"],"D")

if __name__=="__main__": unittest.main()
