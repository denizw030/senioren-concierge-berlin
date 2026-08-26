import unittest
from datetime import date,time
from local_intelligence.core import Category,LocationContext,OpeningStatus
from local_intelligence.provider_mapping import map_google_place,map_tomtom_place
from local_intelligence.providers import InvalidProviderResponse
from local_intelligence.restaurant import RankingMode
from local_intelligence.restaurant_nlp import resolve_restaurant_request

class MappingNlpTests(unittest.TestCase):
    def test_google_response_mapping(self):
        p=map_google_place({"id":"g1","name":"places/g1","displayName":{"text":"Trattoria"},"formattedAddress":"Berlin","location":{"latitude":52.5,"longitude":13.4},"primaryType":"restaurant","currentOpeningHours":{"openNow":True},"rating":4.8,"userRatingCount":1500,"internationalPhoneNumber":"+4930","websiteUri":"https://example.test"})
        self.assertEqual((p.external_provider,p.external_id,p.category,p.opening_status,p.review_count),("google_places_new","g1",Category.RESTAURANT,OpeningStatus.OPEN_NOW,1500))
    def test_google_invalid_response(self):
        with self.assertRaises(InvalidProviderResponse): map_google_place({"id":"x"},Category.RESTAURANT)
    def test_tomtom_response_mapping(self):
        p=map_tomtom_place({"id":"t1","position":{"lat":52.5,"lon":13.4},"address":{"freeformAddress":"Berlin"},"poi":{"name":"R","phone":"030","url":"https://example.test","classifications":[{"code":"RESTAURANT"}]}})
        self.assertEqual((p.external_provider,p.category,p.opening_status),("tomtom_search",Category.RESTAURANT,OpeningStatus.UNKNOWN))
    def test_nlp_auto_reserve(self):
        loc=LocationContext("a","current",52.5,13.4,authorized=True)
        r=resolve_restaurant_request("Such mir heute um 18 Uhr ein italienisches Restaurant in meiner Nähe für zwei und reserviere wenn etwas frei ist.","a","a",loc,date(2026,8,26))
        self.assertEqual((r.date,r.time,r.party_size,r.cuisine_preferences,r.reservation_intent,r.explicit_auto_reserve),(date(2026,8,26),time(18,0),2,["italian"],True,True))
    def test_nlp_best_rated(self):
        r=resolve_restaurant_request("Such mir eines der besten Restaurants in meiner Nähe für heute 19 Uhr.","a","a",object(),date(2026,8,26))
        self.assertEqual(r.ranking_mode,RankingMode.BEST_RATED)
    def test_nlp_passend_memory(self):
        r=resolve_restaurant_request("Such mir ein passendes Restaurant.","a","a",object(),date(2026,8,26))
        self.assertEqual(r.ranking_mode,RankingMode.MEMORY_PERSONALIZED)
    def test_nlp_rating_distance_travel(self):
        r=resolve_restaurant_request("Mindestens 4,5 Sterne, maximal 15 km entfernt, italienisch und höchstens 20 Minuten.","a","a",object(),date(2026,8,26))
        self.assertEqual((r.min_rating,r.max_distance,r.max_travel_time,r.cuisine_preferences),(4.5,15.0,20.0,["italian"]))
    def test_nlp_distance_unimportant(self):
        r=resolve_restaurant_request("Entfernung ist nicht so wichtig, Hauptsache eines der besten.","a","a",object(),date(2026,8,26))
        self.assertEqual(r.ranking_mode,RankingMode.BEST_RATED)

if __name__=="__main__": unittest.main()
