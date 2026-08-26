import unittest
from datetime import datetime, timedelta, timezone
from action_approval_core import *

NOW=datetime(2026,8,26,10,0,tzinfo=timezone.utc)

def auth(action='restaurant.reserve',actor='a',subject='s',account='acct',authorized=True,version='1'):
    return AuthorizationContext(authorized,actor,subject,account,frozenset({action}),version)
def req(action='restaurant.reserve',key='k',actor='a',subject='s',account='acct',params=None,authorization=None):
    return ActionRequest('id-'+key,key,actor,subject,account,action,params or {},authorization or auth(action,actor,subject,account),'whatsapp',NOW)
def good_executor(pa,p): return ActionResult(pa.action_id,True,'fixture-1')

class T(unittest.TestCase):
 def engine(self,flags=None): return ActionApprovalEngine(flags or {},now=lambda:NOW)
 def approved(self, action='restaurant.reserve', params=None, limits=None, flags=None, key='k'):
    e=self.engine(flags or {f'{action}.execute':True}); r=e.request(req(action,key,params=params or {'restaurant':'R','time':18,'party_size':2})); e.authorize(r.request.action_id); e.prepare(r.request.action_id,params or {'restaurant':'R','time':18,'party_size':2},NOW+timedelta(hours=1)); e.require_approval(r.request.action_id); e.approve(r.request.action_id,'ap','a','s','acct',NOW+timedelta(hours=1),limits); return e,r
 def test_01_information_no_mutation(self): self.assertFalse(self.engine().information('x',{})['mutation_performed'])
 def test_02_prepare_no_execute(self):
    e=self.engine(); r=e.request(req()); e.authorize(r.request.action_id); e.prepare(r.request.action_id,{'x':1},NOW+timedelta(hours=1)); self.assertEqual(r.state,ActionState.PREPARED)
 def test_03_approve_concrete(self): self.assertEqual(self.approved()[1].state,ActionState.APPROVED)
 def test_04_execute_without_approval(self):
    e=self.engine({'restaurant.reserve.execute':True}); r=e.request(req()); e.authorize(r.request.action_id); e.prepare(r.request.action_id,{'x':1},NOW+timedelta(hours=1)); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'ek',{'x':1},NOW),good_executor)
 def test_05_execute_without_authorization(self):
    e=self.engine({'restaurant.reserve.execute':True}); r=e.request(req(authorization=auth(authorized=False))); self.assertRaises(ActionBlocked,e.authorize,r.request.action_id)
 def test_06_expired_approval(self):
    e,r=self.approved(); r.approval=ApprovalGrant(**{**r.approval.__dict__,'expires_at':NOW-timedelta(seconds=1)}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor)
 def test_07_revoked(self): e,r=self.approved(); e.revoke(r.request.action_id); self.assertEqual(r.state,ActionState.REVOKED)
 def test_08_parameters_unchanged(self): e,r=self.approved(); self.assertTrue(e.execute(ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor).success)
 def test_09_price_changed(self):
    e,r=self.approved(params={'price':10},limits={'price':10});
    with self.assertRaises(ActionBlocked) as x: e.execute(ExecutionRequest('e',r.request.action_id,'x',{'price':11},NOW),good_executor)
    self.assertIn(RiskGate.PRICE_CHANGED,x.exception.gates)
 def test_10_fee_added(self):
    e,r=self.approved(params={'fee':0},limits={'fee':0});
    with self.assertRaises(ActionBlocked) as x: e.execute(ExecutionRequest('e',r.request.action_id,'x',{'fee':2},NOW),good_executor)
    self.assertIn(RiskGate.FEE_CHANGED,x.exception.gates)
 def test_11_time_within_tolerance(self): e,r=self.approved(params={'time':18},limits={'time':18}); self.assertTrue(e.execute(ExecutionRequest('e',r.request.action_id,'x',{'time':18.25},NOW),good_executor,{'time':.5}).success)
 def test_12_time_outside_tolerance(self): e,r=self.approved(params={'time':18},limits={'time':18}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',{'time':19},NOW),good_executor,{'time':.5})
 def test_13_party_size_changed(self): e,r=self.approved(params={'party_size':2},limits={'party_size':2}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',{'party_size':3},NOW),good_executor)
 def test_14_other_provider(self): e,r=self.approved(params={'provider':'p1'},limits={'provider':'p1'}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',{'provider':'p2'},NOW),good_executor)
 def test_15_other_tariff(self): e,r=self.approved('provider_switch',{'tariff':'t1'},{'tariff':'t1'},{'provider_switch.execute':True}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',{'tariff':'t2'},NOW),good_executor)
 def test_16_prepayment(self): e,r=self.approved(params={'prepayment_required':False},limits={'prepayment_required':False}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',{'prepayment_required':True},NOW),good_executor)
 def test_17_credit_card(self): e,r=self.approved(params={'credit_card_required':False},limits={'credit_card_required':False}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',{'credit_card_required':True},NOW),good_executor)
 def test_18_limited_restaurant_preapproval(self): e,r=self.approved(params={'restaurant':'R','time':18,'party_size':2},limits={'restaurant':'R','time':18,'party_size':2}); self.assertTrue(e.execute(ExecutionRequest('e',r.request.action_id,'x',{'restaurant':'R','time':18.25,'party_size':2},NOW),good_executor,{'time':.5}).success)
 def test_19_memory_no_approval(self): self.assertIsNone(ActionApprovalEngine.memory_suggestion({'restaurant':'R'})['approval'])
 def test_20_family_relationship_no_right(self):
    a=AuthorizationContext(False,'family','s','acct',frozenset({'restaurant.reserve'})); e=self.engine(); r=e.request(req(actor='family',authorization=a)); self.assertRaises(ActionBlocked,e.authorize,r.request.action_id)
 def test_21_family_valid_scope(self):
    a=AuthorizationContext(True,'family','s','acct',frozenset({'restaurant.reserve'})); e=self.engine(); r=e.request(req(actor='family',authorization=a)); self.assertEqual(e.authorize(r.request.action_id).state,ActionState.AUTHORIZED)
 def test_22_duplicate_message(self): e=self.engine(); a=e.request(req()); b=e.request(req()); self.assertIs(a,b)
 def test_23_duplicate_execute(self): e,r=self.approved(); x=e.execute(ExecutionRequest('e',r.request.action_id,'same',r.prepared.parameters,NOW),good_executor); y=e.execute(ExecutionRequest('e2',r.request.action_id,'same',r.prepared.parameters,NOW),good_executor); self.assertIs(x,y)
 def test_24_deterministic_idempotency(self): self.assertEqual(ActionRequest.deterministic_idempotency('x','a','s','acct',{'b':2,'a':1},'m'),ActionRequest.deterministic_idempotency('x','a','s','acct',{'a':1,'b':2},'m'))
 def test_25_flag_off(self): e,r=self.approved(flags={'restaurant.reserve.execute':False}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor)
 def test_26_fixture_flag_on(self): e,r=self.approved(); self.assertEqual(e.execute(ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor).provider_result_id,'fixture-1')
 def test_27_type_specific_flag(self): e,r=self.approved(flags={'provider_switch.execute':True}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor)
 def test_28_wrong_person(self):
    e=self.engine(); r=e.request(req()); e.authorize(r.request.action_id); e.prepare(r.request.action_id,{'x':1},NOW+timedelta(hours=1)); e.require_approval(r.request.action_id); self.assertRaises(ActionBlocked,e.approve,r.request.action_id,'ap','wrong','s','acct',NOW+timedelta(hours=1))
 def test_29_wrong_account(self):
    e=self.engine(); r=e.request(req()); e.authorize(r.request.action_id); e.prepare(r.request.action_id,{'x':1},NOW+timedelta(hours=1)); e.require_approval(r.request.action_id); self.assertRaises(ActionBlocked,e.approve,r.request.action_id,'ap','a','s','wrong',NOW+timedelta(hours=1))
 def test_30_authorization_revoked_after_approval(self): e,r=self.approved(); object.__setattr__(r.request.authorization_context,'authorized',False); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor)
 def test_31_prepared_expired(self): e,r=self.approved(); r.prepared=PreparedAction(**{**r.prepared.__dict__,'expires_at':NOW-timedelta(seconds=1)}); self.assertRaises(ActionBlocked,e.execute,ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor)
 def test_32_approval_expired(self): self.test_06_expired_approval()
 def test_33_cancellation(self): e=self.engine(); r=e.request(req()); e.cancel(r.request.action_id); self.assertEqual(r.state,ActionState.CANCELLED)
 def test_34_failure(self):
    e,r=self.approved(); z=e.execute(ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),lambda pa,p:ActionResult(pa.action_id,False,error_code='fixture')); self.assertFalse(z.success); self.assertEqual(r.state,ActionState.FAILED)
 def test_35_audit_no_secrets(self): e=self.engine(); r=e.request(req()); e._audit(r,'x',{'secret':'s','token':'t','ok':1}); self.assertEqual(r.audits[-1].details,{'ok':1})
 def test_36_provider_metadata_no_influence(self): e=self.engine(); r=e.request(req()); e.authorize(r.request.action_id); p=e.prepare(r.request.action_id,{'x':1},NOW+timedelta(hours=1),{'ranking':999}); self.assertEqual(p.provider_metadata['ranking'],999); self.assertEqual(r.state,ActionState.PREPARED)
 def test_37_restaurant_scenario(self): e,r=self.approved(); self.assertTrue(e.execute(ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor).success)
 def test_38_outbound_call_scenario(self): e,r=self.approved('outbound_call',{'target':'+49x','purpose':'appointment','scope':'opening_hours'},flags={'outbound_call.execute':True}); self.assertTrue(e.execute(ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor).success)
 def test_39_provider_switch_scenario(self): e,r=self.approved('provider_switch',{'provider':'A','tariff':'T','price':30,'contract_term':12},flags={'provider_switch.execute':True}); self.assertTrue(e.execute(ExecutionRequest('e',r.request.action_id,'x',r.prepared.parameters,NOW),good_executor).success)
 def test_40_no_real_customer_data(self):
    e,r=self.approved(); text=repr(e.actions); self.assertNotIn('@',text); self.assertNotIn('4917',text)

if __name__=='__main__': unittest.main()
