import unittest
from dataclasses import replace
from datetime import datetime, timezone
from provider_switch_core import (
    Check24Adapter, CommercialMetadata, MissingPartnerConfiguration, NeedProfile,
    NormalizedOffer, OfferSearchRequest, ProviderRateLimited, ProviderUnavailable,
    StructuredSearchUnavailable, VerivoxAdapter, rank_offers,
    raise_for_provider_status, select_concierge_recommendations, validate_offer,
)

def offer(oid='A', **kw):
    base=dict(offer_id=oid,provider_name='TEST PROVIDER',tariff_name='TEST TARIFF',product_type='electricity',monthly_base_price=20.0,variable_unit_price=0.30,annual_usage_units=2000,minimum_term_months=12,cancellation_notice_days=30,price_guarantee_months=12,performance=100,available=True,source='TEST_FIXTURE',fetched_at='TEST_ONLY',risk_score=0.1,preference_match=0.5,commercial=CommercialMetadata())
    base.update(kw); return NormalizedOffer(**base)

REQ=OfferSearchRequest('electricity','TEST-PLZ',annual_usage_units=2000)

class ProviderIntegrationTests(unittest.TestCase):
    def test_verivox_fixture_normalization(self):
        raw={'fixture_schema':'NAHWERK_VERIVOX_TEST_FIXTURE_V1','offer_id':'vx-test','provider_name':'TEST VX PROVIDER','tariff_name':'TEST VX TARIFF','product_type':'electricity','monthly_base_price':15,'variable_unit_price':0.25,'annual_usage_units':2000,'minimum_term_months':12,'cancellation_notice_days':30,'price_guarantee_months':12,'available':True,'fetched_at':'TEST_ONLY'}
        result=VerivoxAdapter(True,[raw]).search_offers(REQ)[0]
        self.assertEqual((result.offer_id,result.source),('vx-test','VERIVOX_TEST_FIXTURE'))
    def test_verivox_missing_partner_data(self):
        with self.assertRaises(MissingPartnerConfiguration): VerivoxAdapter().search_offers(REQ)
    def test_provider_outage(self):
        with self.assertRaises(ProviderUnavailable): VerivoxAdapter(True,[]).search_offers(REQ)
    def test_rate_limit(self):
        with self.assertRaises(ProviderRateLimited): raise_for_provider_status(429,60)
    def test_check24_linkout_missing_partner_data(self):
        with self.assertRaises(MissingPartnerConfiguration): Check24Adapter().build_link_out()
    def test_check24_linkout_fixture(self):
        url='https://partner.example.test/CHECK24-TEST-LINK'
        self.assertEqual(Check24Adapter(url,'TEST_TRACKING').build_link_out(),url)
    def test_check24_structured_api_not_faked(self):
        with self.assertRaises(StructuredSearchUnavailable): Check24Adapter().search_offers(REQ)
    def test_stale_offer(self):
        stale=offer('stale',valid_until='2020-01-01T00:00:00Z')
        ok,errors=validate_offer(stale,datetime(2026,8,26,tzinfo=timezone.utc))
        self.assertFalse(ok); self.assertIn('offer_stale',errors); self.assertTrue(rank_offers([stale],NeedProfile())[0].blocked)
    def test_missing_following_year_price(self):
        self.assertFalse(rank_offers([offer(monthly_price_after_promo=None)],NeedProfile())[0].blocked)
    def test_missing_bonus(self):
        self.assertFalse(rank_offers([offer(eligible_bonus_first_year=0)],NeedProfile())[0].blocked)
    def test_partner_commission_never_changes_score(self):
        a=offer('neutral'); b=replace(a,offer_id='partner',commercial=CommercialMetadata(partner_status='partner',sponsored=True,commission_value=500,confirmed=True))
        r={x.offer_id:x for x in rank_offers([a,b],NeedProfile())}
        self.assertEqual(r['neutral'].total_score,r['partner'].total_score)
        self.assertEqual(r['partner'].components['commission'],0)
    def test_max_three_concierge_recommendations(self):
        offers=[offer(str(i),monthly_base_price=20+i,price_guarantee_months=24 if i==2 else 6) for i in range(6)]
        self.assertLessEqual(len(select_concierge_recommendations(offers,NeedProfile(),limit=99)),3)
    def test_capabilities_mark_real_integrations_not_ready(self):
        self.assertFalse(VerivoxAdapter().get_provider_capabilities().production_ready)
        self.assertFalse(Check24Adapter().get_provider_capabilities().production_ready)

if __name__=='__main__': unittest.main()
