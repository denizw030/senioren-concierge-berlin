import unittest
from datetime import date, time

from local_intelligence.core import Category, Confidence, LocationContext, OpeningStatus, Place
from local_intelligence.providers import ProviderRateLimited, ProviderUnavailable
from local_intelligence.restaurant import AvailabilityResult, AvailabilityStatus, RestaurantCandidate, RestaurantRequest, rank_restaurants
from local_intelligence.restaurant_availability import *


def candidate(external_id="r1", *, partner=False, reservation_url=None, rating=4.7):
    place = Place("fixture", external_id, external_id, Category.RESTAURANT, "Berlin", 52.5, 13.4,
                  distance=2, travel_time=8, opening_status=OpeningStatus.OPEN_NOW,
                  rating=rating, review_count=500, confidence=Confidence.HIGH, partner=partner)
    return RestaurantCandidate(place, cuisines=["italian"], reservation_url=reservation_url, commercial_partner=partner)


def request(**changes):
    base = dict(actor_person_id="a", subject_person_id="a",
                location_context=LocationContext("a", "current", 52.5, 13.4, authorized=True),
                date=date(2026, 8, 26), time=time(18, 0), party_size=2,
                cuisine_preferences=["italian"], reservation_intent=True, explicit_auto_reserve=True)
    base.update(changes)
    return RestaurantRequest(**base)


class AvailabilityProviderTests(unittest.TestCase):
    def test_01_provider_with_real_availability_capability(self):
        self.assertTrue(OPENTABLE_CAPABILITIES.supports_availability_search)
        self.assertTrue(QUANDOO_CAPABILITIES.supports_timeslots)
        self.assertTrue(ALENO_CAPABILITIES.supports_availability_search)

    def test_02_provider_without_availability(self):
        self.assertFalse(THEFORK_CAPABILITIES.supports_availability_search)
        self.assertFalse(RESMIO_CAPABILITIES.supports_timeslots)

    def test_03_timeslot_present(self):
        fixture = AvailabilityResult(AvailabilityStatus.AVAILABLE, offered_times=["18:00", "18:30"], reservation_possible=True)
        adapter = OpenTableAvailabilityAdapter(partner_configured=True, fixtures={"r1": fixture})
        self.assertEqual(adapter.check_availability(candidate(), request()).offered_times[0], "18:00")

    def test_04_no_timeslot(self):
        fixture = AvailabilityResult(AvailabilityStatus.UNAVAILABLE, offered_times=[])
        adapter = OpenTableAvailabilityAdapter(partner_configured=True, fixtures={"r1": fixture})
        self.assertEqual(adapter.check_availability(candidate(), request()).status, AvailabilityStatus.UNAVAILABLE)

    def test_05_alternative_times(self):
        fixture = AvailabilityResult(AvailabilityStatus.AVAILABLE, offered_times=["18:30", "19:00"], reservation_possible=True)
        adapter = QuandooAvailabilityAdapter(partner_configured=True, fixtures={"r1": fixture})
        self.assertEqual(adapter.check_availability(candidate(), request()).offered_times, ["18:30", "19:00"])

    def test_06_provider_unavailable(self):
        adapter = OpenTableAvailabilityAdapter(partner_configured=True)
        with self.assertRaises(ProviderUnavailable):
            adapter.check_availability(candidate(), request())

    def test_07_rate_limit(self):
        with self.assertRaises(ProviderRateLimited):
            map_provider_http_error(429)

    def test_08_missing_partner_configuration(self):
        with self.assertRaises(MissingPartnerConfiguration):
            OpenTableAvailabilityAdapter().build_search_input(candidate(), request())

    def test_09_deeplink_only(self):
        adapter = DeepLinkOnlyAdapter("resmio", RESMIO_CAPABILITIES, partner_configured=True)
        self.assertEqual(adapter.booking_link(candidate(reservation_url="https://booking.example/r1")), "https://booking.example/r1")

    def test_10_no_fake_api(self):
        with self.assertRaises(UnsupportedProviderCapability):
            DeepLinkOnlyAdapter("thefork", THEFORK_CAPABILITIES, partner_configured=True).build_search_input(candidate(), request())

    def test_11_fallback_to_outbound_call(self):
        plan = choose_provider_plan(capabilities=THEFORK_CAPABILITIES, partner_configured=False,
                                    deeplink_available=False, restaurant_system_available=False, phone_available=True)
        self.assertEqual(plan.action, ProviderAction.OUTBOUND_CALL)

    def test_12_needs_user_input(self):
        plan = choose_provider_plan(capabilities=None, partner_configured=False,
                                    deeplink_available=False, restaurant_system_available=False, phone_available=False)
        self.assertEqual(plan.action, ProviderAction.NEEDS_USER_INPUT)

    def test_13_provision_zero_ranking_influence(self):
        a = candidate("a", partner=False)
        b = candidate("b", partner=True)
        self.assertEqual([x.place.external_id for x in rank_restaurants([a, b], request())], ["a", "b"])

    def test_14_fee_blocks_auto_confirm(self):
        availability = AvailabilityResult(AvailabilityStatus.AVAILABLE, offered_times=["18:00"], fee_required=True)
        prepared = OpenTableAvailabilityAdapter(partner_configured=True).prepare_reservation(candidate(), request(), availability)
        with self.assertRaises(PermissionError):
            OpenTableAvailabilityAdapter(partner_configured=True).confirm_reservation(prepared)

    def test_15_prepayment_blocks_auto_confirm(self):
        availability = AvailabilityResult(AvailabilityStatus.AVAILABLE, offered_times=["18:00"], prepayment_required=True)
        prepared = OpenTableAvailabilityAdapter(partner_configured=True).prepare_reservation(candidate(), request(), availability)
        with self.assertRaises(PermissionError):
            OpenTableAvailabilityAdapter(partner_configured=True).confirm_reservation(prepared)

    def test_16_wrong_party_size(self):
        with self.assertRaises(ValueError):
            AvailabilitySearchInput("r1", "2026-08-26", "18:00", 0)

    def test_17_deviating_time(self):
        availability = AvailabilityResult(AvailabilityStatus.AVAILABLE, offered_times=["18:30"])
        with self.assertRaises(ValueError):
            OpenTableAvailabilityAdapter(partner_configured=True).prepare_reservation(candidate(), request(), availability)

    def test_18_family_authorization_remains_required(self):
        from local_intelligence.restaurant import AuthorizationContext, authorize
        family_req = request(actor_person_id="family", subject_person_id="senior")
        with self.assertRaises(PermissionError):
            authorize(family_req, AuthorizationContext("family", "senior", frozenset()))

    def test_19_no_customer_data_in_search(self):
        search = OpenTableAvailabilityAdapter(partner_configured=True).build_search_input(candidate(), request())
        self.assertNotIn("name", search.__dict__)
        self.assertNotIn("phone", search.__dict__)
        self.assertNotIn("email", search.__dict__)

    def test_20_minimum_data_at_prepare(self):
        guest = ReservationGuestData("Max", phone="+4930000")
        payload = guest.minimal_payload()
        self.assertEqual(set(payload), {"name", "phone"})

    def test_21_no_live_reservation_in_tests(self):
        prepared = OpenTableAvailabilityAdapter(partner_configured=True).prepare_reservation(
            candidate(), request(), AvailabilityResult(AvailabilityStatus.AVAILABLE, offered_times=["18:00"]))
        with self.assertRaises(ProviderUnavailable):
            OpenTableAvailabilityAdapter(partner_configured=True).confirm_reservation(prepared)

    def test_22_quandoo_webhook(self):
        self.assertTrue(QUANDOO_CAPABILITIES.supports_webhook)

    def test_23_google_reserve_not_upstream_availability_api(self):
        self.assertFalse(GOOGLE_RESERVE_CAPABILITIES.supports_availability_search)

    def test_24_partner_contract_flags(self):
        for caps in [OPENTABLE_CAPABILITIES, QUANDOO_CAPABILITIES, THEFORK_CAPABILITIES,
                     SEVENROOMS_CAPABILITIES, RESMIO_CAPABILITIES, GOOGLE_RESERVE_CAPABILITIES, ALENO_CAPABILITIES]:
            self.assertTrue(caps.requires_partner_contract)

    def test_25_structured_provider_wins_fallback(self):
        plan = choose_provider_plan(capabilities=OPENTABLE_CAPABILITIES, partner_configured=True,
                                    deeplink_available=True, restaurant_system_available=True, phone_available=True)
        self.assertEqual(plan.action, ProviderAction.STRUCTURED_AVAILABILITY)

    def test_26_deeplink_before_call(self):
        plan = choose_provider_plan(capabilities=THEFORK_CAPABILITIES, partner_configured=False,
                                    deeplink_available=True, restaurant_system_available=False, phone_available=True)
        self.assertEqual(plan.action, ProviderAction.DEEPLINK)

    def test_27_restaurant_system_before_call(self):
        plan = choose_provider_plan(capabilities=None, partner_configured=False,
                                    deeplink_available=False, restaurant_system_available=True, phone_available=True)
        self.assertEqual(plan.action, ProviderAction.RESTAURANT_SYSTEM)


if __name__ == "__main__":
    unittest.main()
