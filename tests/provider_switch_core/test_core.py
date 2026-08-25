import unittest
from dataclasses import replace

from provider_switch_core import (
    Check24Adapter, CommercialMetadata, ContractIntelligence, ExtractedField,
    FixtureProviderAdapter, NeedProfile, NormalizedOffer, VerificationStatus,
    calculate_cost, execution_allowed, rank_offers, validate_contract
)


def offer(oid='A', **kw):
    base = dict(
        offer_id=oid, provider_name='TEST PROVIDER', tariff_name='TEST TARIFF', product_type='electricity',
        monthly_base_price=20.0, variable_unit_price=0.30, annual_usage_units=2000,
        one_time_costs=0, hardware_costs=0, connection_costs=0, shipping_costs=0,
        eligible_bonus_first_year=0, monthly_price_after_promo=20.0, promo_months=0,
        minimum_term_months=12, cancellation_notice_days=30, price_guarantee_months=12,
        performance=100, available=True, source='TEST_FIXTURE', fetched_at='TEST_ONLY', risk_score=0.1,
        preference_match=0.5, commercial=CommercialMetadata()
    )
    base.update(kw)
    return NormalizedOffer(**base)

class CoreTests(unittest.TestCase):
    def test_total_cost_base_variable_and_fees(self):
        c = calculate_cost(offer(one_time_costs=10, hardware_costs=12, connection_costs=8, shipping_costs=5), 12)
        self.assertEqual((c.recurring_base, c.variable_usage, c.total), (240, 600, 875))

    def test_bonus_separate(self):
        c = calculate_cost(offer(eligible_bonus_first_year=100), 12)
        self.assertEqual((c.bonuses, c.total), (100, 740))

    def test_one_time_bonus_does_not_distort_long_term_ranking(self):
        promo = offer('promo', monthly_base_price=10, monthly_price_after_promo=60, promo_months=12, eligible_bonus_first_year=200)
        stable = offer('stable', monthly_base_price=25, monthly_price_after_promo=25)
        self.assertEqual(rank_offers([promo, stable], NeedProfile(required_performance=50))[0].offer_id, 'stable')

    def test_cheapest_is_not_automatically_best(self):
        cheap = offer('cheap', monthly_base_price=10, monthly_price_after_promo=10, performance=50, risk_score=1.0, preference_match=0)
        suitable = offer('suitable', monthly_base_price=22, monthly_price_after_promo=22, performance=200, risk_score=0, preference_match=1)
        self.assertEqual(rank_offers([cheap, suitable], NeedProfile(required_performance=150))[0].offer_id, 'suitable')

    def test_performance_hard_gate(self):
        self.assertTrue(rank_offers([offer(performance=20)], NeedProfile(required_performance=100))[0].blocked)

    def test_regional_availability_hard_gate(self):
        r = rank_offers([offer(available=False)], NeedProfile())[0]
        self.assertTrue(r.blocked)
        self.assertIn('availability_not_verified', r.reasons)

    def test_missing_required_data_no_false_precision(self):
        r = rank_offers([offer(monthly_base_price=None)], NeedProfile())[0]
        self.assertTrue(r.blocked)
        self.assertEqual(r.total_score, 0)

    def test_low_confidence_contract_requires_review(self):
        contract = ContractIntelligence('electricity', {
            'provider': ExtractedField('TEST', .95, verification_status=VerificationStatus.VERIFIED),
            'tariff': ExtractedField('T', .95, verification_status=VerificationStatus.VERIFIED),
            'annual_usage_units': ExtractedField(2000, .55, verification_status=VerificationStatus.UNCERTAIN),
        })
        ok, errors = validate_contract(contract)
        self.assertFalse(ok)
        self.assertTrue(any('annual_usage_units' in e for e in errors))
        self.assertTrue(rank_offers([offer()], NeedProfile(), contract)[0].review_required)

    def test_uncertain_ocr_value_not_usable(self):
        self.assertFalse(ExtractedField(9999, .51, 'OCR TEST', VerificationStatus.UNCERTAIN).usable_for_decision)

    def test_commission_has_zero_ranking_effect(self):
        a = offer('a')
        b = replace(a, offer_id='b', commercial=CommercialMetadata(commission_amount=9999, partner_status='premium', sponsored=True))
        r = {x.offer_id: x for x in rank_offers([a, b], NeedProfile())}
        self.assertEqual(r['a'].total_score, r['b'].total_score)
        self.assertEqual((r['b'].components['commission'], r['b'].components['partner_status'], r['b'].components['sponsored']), (0, 0, 0))

    def test_customer_preferences_can_matter(self):
        self.assertEqual(rank_offers([offer('low', preference_match=0), offer('high', preference_match=1)], NeedProfile(customer_preferences={'stability':'high'}))[0].offer_id, 'high')

    def test_risk_can_outweigh_small_saving(self):
        risky = offer('risky', monthly_base_price=19, monthly_price_after_promo=19, risk_score=1)
        safe = offer('safe', monthly_base_price=20, monthly_price_after_promo=20, risk_score=0)
        self.assertEqual(rank_offers([risky, safe], NeedProfile())[0].offer_id, 'safe')

    def test_term_and_price_guarantee_affect_score(self):
        flexible = offer('flex', minimum_term_months=1, price_guarantee_months=24)
        locked = offer('locked', minimum_term_months=24, price_guarantee_months=0)
        self.assertEqual(rank_offers([locked, flexible], NeedProfile())[0].offer_id, 'flex')

    def test_fixture_provider_is_test_only(self):
        adapter = FixtureProviderAdapter([offer('fixture'), replace(offer('x'), source='OTHER')])
        self.assertEqual([o.offer_id for o in adapter.search_offers('electricity', 'TEST REGION', NeedProfile())], ['fixture'])

    def test_real_provider_adapter_not_faked(self):
        with self.assertRaises(NotImplementedError):
            Check24Adapter().search_offers('electricity', '10115', NeedProfile())

    def test_execute_disabled(self):
        self.assertFalse(execution_allowed())

if __name__ == '__main__':
    unittest.main()
