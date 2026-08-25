import unittest
from local_intelligence.core import *
def p(id,name="Ort",cat=Category.PHARMACY,dist=1,status=OpeningStatus.OPEN_NOW,closed=False,partner=False,address="A 1",lat=52.4,lng=13.3,phone="0301",website="https://x.example",confidence=Confidence.HIGH): return Place("fixture",id,name,cat,address,lat,lng,dist,None,phone,website,status,None,4.5,200,closed,confidence,{},partner)
class CoreTests(unittest.TestCase):
 def test_01_nearby_pharmacy(self): self.assertEqual(resolve_query("Apotheke in meiner Nähe").category,Category.PHARMACY)
 def test_02_open_now(self): self.assertTrue(resolve_query("Apotheke jetzt geöffnet").open_now)
 def test_03_restaurant(self): self.assertEqual(resolve_query("Restaurant in Zehlendorf").category,Category.RESTAURANT)
 def test_04_electrician(self): self.assertEqual(resolve_query("Elektriker").category,Category.ELECTRICIAN)
 def test_05_unknown_location(self): self.assertEqual(resolve_query("Restaurant").location_target,"unknown")
 def test_06_explicit(self): self.assertEqual(resolve_query("Restaurant in Zehlendorf").location_target,"explicit")
 def test_07_family_auth(self): self.assertTrue(accept_family_location(LocationContext("m","family_authorized_location",authorized=True)).authorized)
 def test_08_family_denied(self):
  with self.assertRaises(PermissionError): accept_family_location(LocationContext("m","family_authorized_location",authorized=False))
 def test_09_wrong_category(self): self.assertFalse(eligibility(p("1"),Category.RESTAURANT))
 def test_10_closed(self): self.assertFalse(eligibility(p("1",closed=True),Category.PHARMACY))
 def test_11_duplicate(self): self.assertEqual(len(deduplicate([p("1"),p("2")])),1)
 def test_12_outage(self):
  with self.assertRaises(ProviderError): FixtureProviderAdapter(failure="outage").search_places(resolve_query("Apotheke"),LocationContext(None,"explicit_search_location",locality="Berlin",authorized=True))
 def test_13_rate(self):
  with self.assertRaises(ProviderRateLimit): FixtureProviderAdapter(failure="rate_limit").search_places(resolve_query("Apotheke"),LocationContext(None,"explicit_search_location",locality="Berlin",authorized=True))
 def test_14_memory(self): self.assertEqual(rank([p("1",dist=1),p("2",dist=1)],{"provider_positive_history":["2"]})[0].external_id,"2")
 def test_15_max_distance(self): self.assertFalse(eligibility(p("1",dist=20),Category.PHARMACY,5))
 def test_16_route_vs_air(self): self.assertGreater(haversine_km(52.4,13.3,52.5,13.4),0)
 def test_17_unknown_hours(self): self.assertIn("unklar",senior_output([p("1",status=OpeningStatus.UNKNOWN)])[0]["opening"])
 def test_18_closed_not_high(self): self.assertEqual(rank([p("o",dist=3),p("c",dist=0,status=OpeningStatus.CLOSED_NOW)])[0].external_id,"o")
 def test_19_partner_zero(self): self.assertEqual([x.external_id for x in rank([p("1",partner=True),p("2",partner=False)])],["1","2"])
 def test_20_provider_id(self): self.assertTrue(duplicate(p("1"),p("1",address="B",phone="2",website="https://y.example",lat=1,lng=1)))
 def test_21_same_name_different_place(self): self.assertFalse(duplicate(p("1",name="X"),p("2",name="X",address="B",phone="2",website="https://y.example",lat=1,lng=1)))
 def test_22_max_three(self): self.assertEqual(len(senior_output([p(str(i),address=str(i),phone=str(i),website=f"https://{i}.x",lat=52+i*.1) for i in range(5)])),3)
 def test_23_memory_no_fact_override(self): self.assertFalse(eligibility(p("1",closed=True),Category.PHARMACY))
 def test_24_fixture_synthetic(self): self.assertEqual(FixtureProviderAdapter([p("synthetic")]).places[0].external_id,"synthetic")
if __name__=="__main__": unittest.main()
