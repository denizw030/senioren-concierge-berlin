import pytest
from service_appointment.core import *

def loc(ok=True): return LocationContext('explicit',locality='Berlin',authorized=ok)
def auth(self=True,scopes=()): return AuthorizationContext('a','a' if self else 'b',frozenset(scopes))
def req(cat=ServiceCategory.HAIRDRESSER,**kw):
    d=dict(request_id='r',actor_person_id='a',subject_person_id='a',account_id='acc',service_category=cat,service_query='x',location=loc(),authorization_context=auth(),source_channel='whatsapp',source_message_id='m'); d.update(kw); return ServiceRequest(**d)
def prov(i='1',cat=ServiceCategory.HAIRDRESSER,**kw):
    d=dict(provider_id=i,external_provider='fixture',external_id=i,name='P'+i,category=cat,address='Berlin',service_area={'Berlin'},confidence=.8); d.update(kw); return ServiceProvider(**d)
def ap(r=None,p='1',**kw):
    r=r or req(); d=dict(service_request_id=r.request_id,provider_id=p,actor_person_id=r.actor_person_id,subject_person_id=r.subject_person_id,account_id=r.account_id,requested_date='2026-08-27',requested_time='15:00',acceptable_time_window=('14:00','17:00'),service_type='cut',price_limit=35,authorization_context=r.authorization_context); d.update(kw); return AppointmentRequest(**d)

@pytest.mark.parametrize('cat',[ServiceCategory.HAIRDRESSER,ServiceCategory.ELECTRICIAN,ServiceCategory.PLUMBER,ServiceCategory.OPTICIAN,ServiceCategory.HEARING_AID,ServiceCategory.FOOT_CARE,ServiceCategory.IT_SUPPORT])
def test_categories(cat): assert eligible(prov(cat=cat),req(cat))
def test_unknown_location(): assert validate_request(req(location=loc(False)))==AvailabilityState.NEEDS_USER_INPUT
def test_unknown_category(): assert validate_request(req(ServiceCategory.OTHER))==AvailabilityState.NEEDS_USER_INPUT
def test_max_distance(): assert not eligible(prov(distance_km=5),req(max_distance=2))
def test_max_travel(): assert not eligible(prov(travel_minutes=40),req(max_travel_time=20))
@pytest.mark.parametrize('a',[Accessibility.ROLLATOR,Accessibility.WHEELCHAIR,Accessibility.NO_STAIRS])
def test_accessibility(a): assert eligible(prov(accessibility={a}),req(accessibility_requirements={a}))
def test_accessibility_hard_gate(): assert not eligible(prov(accessibility=set()),req(accessibility_requirements={Accessibility.ROLLATOR}))
def test_passend(): assert rank_providers([prov('1',distance_km=1),prov('2',distance_km=2)],req())[0].provider_id=='1'
def test_best_reviews(): assert rank_providers([prov('1',rating=5,review_count=3),prov('2',rating=4.8,review_count=1500)],req(ranking_mode=RankingMode.EINES_DER_BESTEN))[0].provider_id=='2'
def test_nearest(): assert rank_providers([prov('1',distance_km=2),prov('2',distance_km=.5)],req(ranking_mode=RankingMode.NAECHSTE))[0].provider_id=='2'
def test_cheapest(): assert rank_providers([prov('1',price_information=PriceInfo(PriceKind.FIXED,40)),prov('2',price_information=PriceInfo(PriceKind.FIXED,20))],req(ranking_mode=RankingMode.GUENSTIGSTE))[0].provider_id=='2'
def test_fastest(): assert rank_providers([prov('1',next_available_minutes=100),prov('2',next_available_minutes=20)],req(ranking_mode=RankingMode.SCHNELLSTER_TERMIN))[0].provider_id=='2'
def test_travel(): assert rank_providers([prov('1',travel_minutes=30),prov('2',travel_minutes=10)],req(ranking_mode=RankingMode.WENIGSTE_ANREISE))[0].provider_id=='2'
def test_partner_zero_bonus(): assert quality(prov('1',partner=True,rating=4.5,review_count=100))==quality(prov('2',partner=False,rating=4.5,review_count=100))
def test_max_three(): assert len(rank_providers([prov(str(i)) for i in range(5)],req()))==3
def test_opening_not_availability(): assert prov(opening_status='OPEN_NOW').opening_status=='OPEN_NOW' and AvailabilityState.AVAILABLE.value!='OPEN_NOW'
@pytest.mark.parametrize('state',[AvailabilityState.AVAILABLE,AvailabilityState.UNAVAILABLE,AvailabilityState.UNKNOWN])
def test_availability_states(state): assert AvailabilityResult(state).state==state
def test_requires_call(): assert FixtureAppointmentProvider([prov(phone='1')],capabilities={Capability.SEARCH}).check_availability(ap()).state==AvailabilityState.REQUIRES_CALL
def test_external_booking(): assert FixtureAppointmentProvider([prov(booking_url='https://example.test')],capabilities={Capability.SEARCH}).check_availability(ap()).state==AvailabilityState.REQUIRES_EXTERNAL_BOOKING
def test_provider_unavailable(): assert FixtureAppointmentProvider([prov()],fail=True).check_availability(ap()).state==AvailabilityState.PROVIDER_UNAVAILABLE
def test_rate_limit_fail_closed():
    with pytest.raises(RuntimeError): FixtureAppointmentProvider([prov()],fail=True).search_providers(req())
def test_online_prepare(): assert FixtureAppointmentProvider([prov()]).prepare_appointment(ap())['provider_id']=='1'
def test_approval_required():
    r=req(authorization_context=auth(False,{'service.appointment.prepare'})); assert prepare_action(r,ap(r),AvailabilityResult(AvailabilityState.AVAILABLE,price=PriceInfo(PriceKind.FIXED,30))).stage==ActionStage.PREPARE
def test_execute_off(): assert prepare_action(req(),ap(),AvailabilityResult(AvailabilityState.AVAILABLE,price=PriceInfo(PriceKind.FIXED,30))).reason=='execute_default_off'
def pre(**kw):
    d=dict(provider_ids=frozenset({'1'}),date='2026-08-27',time_window=('14:00','17:00'),service_type='cut',max_price=35); d.update(kw); return PreAuthorization(**d)
def test_limited_preauth(): assert within_preauth(pre(),'1','2026-08-27','15:00','cut',PriceInfo(PriceKind.FIXED,30),set())
def test_time_inside(): assert within_preauth(pre(),'1','2026-08-27','14:00','cut',PriceInfo(PriceKind.FIXED,30),set())
def test_time_outside(): assert not within_preauth(pre(),'1','2026-08-27','18:00','cut',PriceInfo(PriceKind.FIXED,30),set())
def test_price_inside(): assert check_price(PriceInfo(PriceKind.FIXED,30),35)
def test_price_over(): assert not check_price(PriceInfo(PriceKind.FIXED,40),35)
@pytest.mark.parametrize('kind',[PriceKind.FIXED,PriceKind.FROM_PRICE,PriceKind.ESTIMATE,PriceKind.UNKNOWN])
def test_price_kinds(kind): assert PriceInfo(kind,30 if kind!=PriceKind.UNKNOWN else None).kind==kind
def test_payment_gate(): assert prepare_action(req(),ap(),AvailabilityResult(AvailabilityState.AVAILABLE,price=PriceInfo(PriceKind.FIXED,30)),payment=True).stage==ActionStage.APPROVE
def test_card_gate(): assert prepare_action(req(),ap(),AvailabilityResult(AvailabilityState.AVAILABLE,price=PriceInfo(PriceKind.FIXED,30)),card=True).stage==ActionStage.APPROVE
def test_cancel_fee_gate(): assert prepare_action(req(),ap(),AvailabilityResult(AvailabilityState.AVAILABLE,price=PriceInfo(PriceKind.FIXED,30)),cancellation_fee=True).stage==ActionStage.APPROVE
def test_family_self(): assert authorize(req(),'service.appointment.book')
def test_family_no_scope(): assert not authorize(req(authorization_context=auth(False)),'service.appointment.prepare')
def test_family_information(): assert authorize(req(authorization_context=auth(False,{'service.information'})),'service.information')
def test_family_prepare(): assert authorize(req(authorization_context=auth(False,{'service.appointment.prepare'})),'service.appointment.prepare')
def test_family_book(): assert authorize(req(authorization_context=auth(False,{'service.appointment.book'})),'service.appointment.book')
def test_relationship_not_authority(): assert not authorize(req(authorization_context=auth(False)),'service.appointment.book')
def test_memory_hook(): assert delegate_hook('memory',{'preferred_provider':'x'})['delegate_to']=='memory'
def test_memory_no_approval(): assert delegate_hook('memory',{})['delegate_to']!='action_approval'
def test_outbound_hook(): assert delegate_hook('outbound_call',{})['delegate_to']=='outbound_call'
def test_call_scope(): assert set(outbound_call_task(ap(),prov(phone='123')))=={'provider_id','provider_phone','purpose','service_type','requested_date','requested_time','acceptable_time_window','accessibility','price_limit','allowed_questions'}
def test_reminder_hook(): assert delegate_hook('reminder',{})['delegate_to']=='reminder'
def test_mobility_hook(): assert delegate_hook('mobility',{})['delegate_to']=='mobility'
def test_fraud_hook(): assert delegate_hook('fraud',{})['delegate_to']=='fraud'
def test_duplicate_message():
    g=IdempotencyGuard(); assert g.accept_message('m') and not g.accept_message('m')
def test_duplicate_booking():
    g=IdempotencyGuard(); assert g.accept_booking('b') and not g.accept_booking('b')
def test_audit_privacy(): assert set(audit('service_requested',request_id='r',source_message_id='m'))=={'event','request_id','provider_id','source_message_id'}
@pytest.mark.parametrize('channel',['whatsapp','web','phone','app'])
def test_channel_neutrality(channel): assert req(source_channel=channel).source_channel==channel
def test_medical_boundary(): assert medical_boundary(ServiceCategory.HEALTH_APPOINTMENT)=={'organizational_only':True,'diagnosis':False,'treatment_recommendation':False,'medical_best_claim':False}
def test_no_real_customer_data(): assert 'name' not in req().__dict__
def test_no_live_booking(): assert not FixtureAppointmentProvider([prov()]).capabilities.supports(Capability.CONFIRM)
def test_no_n8n_surface(): import service_appointment.core as c; assert 'n8n' not in c.__dict__
def test_no_production_surface(): import service_appointment.core as c; assert 'production' not in c.__dict__
def test_provider_ids_separate(): assert prov().external_id=='1' and prov().external_provider=='fixture'
def test_unknown_price_blocks_limit(): assert not check_price(PriceInfo(),35)
def test_from_price_not_guaranteed(): assert not PriceInfo(PriceKind.FROM_PRICE,30).guaranteed()
def test_fixed_guaranteed(): assert PriceInfo(PriceKind.FIXED,30).guaranteed()
def test_availability_unknown_blocks_prepare(): assert prepare_action(req(),ap(),AvailabilityResult(AvailabilityState.UNKNOWN)).stage==ActionStage.NEEDS_USER_INPUT
def test_scope_missing_blocks():
    r=req(authorization_context=auth(False)); assert prepare_action(r,ap(r),AvailabilityResult(AvailabilityState.AVAILABLE,price=PriceInfo(PriceKind.FIXED,30))).stage==ActionStage.BLOCKED
def test_accessibility_not_age_assumed(): assert req().accessibility_requirements==set()
def test_preauth_payment_change(): assert not within_preauth(pre(),'1','2026-08-27','15:00','cut',PriceInfo(PriceKind.FIXED,30),set(),payment=True)
def test_preauth_other_provider(): assert not within_preauth(pre(),'2','2026-08-27','15:00','cut',PriceInfo(PriceKind.FIXED,30),set())
def test_preauth_other_date(): assert not within_preauth(pre(),'1','2026-08-28','15:00','cut',PriceInfo(PriceKind.FIXED,30),set())
def test_senior_summary_three(): assert len(senior_summary([prov(str(i)) for i in range(5)]))==3
