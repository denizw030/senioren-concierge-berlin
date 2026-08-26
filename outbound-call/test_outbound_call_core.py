import importlib.util, pathlib, unittest
p=pathlib.Path(__file__).with_name('outbound_call_core.py'); s=importlib.util.spec_from_file_location('core',p); c=importlib.util.module_from_spec(s); s.loader.exec_module(c)


def req(**kw):
 d=dict(request_id='r1',actor_person_id='p1',subject_person_id='p1',action_type='restaurant.availability',target_name='R',target_phone='+49301234567',authorized_scope={'restaurant.availability'},parameters={'requested_time':'18:00','requested_party_size':2})
 d.update(kw); return c.OutboundCallRequest(**d)

class Tests(unittest.TestCase):
 def setUp(self): self.p=c.FixtureVoiceAdapter(); self.a=c.FixtureRealtimeVoiceAgent(); self.o=c.CallOrchestrator(self.p,self.a)
 def test_01_valid_call(self): self.assertEqual(self.o.create(req()).status,c.CallState.QUEUED)
 def test_02_missing_number(self):
  with self.assertRaises(ValueError): self.o.create(req(target_phone=''))
 def test_03_invalid_number(self):
  with self.assertRaises(ValueError): self.o.create(req(target_phone='030'))
 def test_04_missing_auth(self):
  with self.assertRaises(PermissionError): self.o.create(req(authorized_scope=set()))
 def test_05_family_relationship_no_scope(self):
  with self.assertRaises(PermissionError): self.o.create(req(actor_person_id='family',subject_person_id='senior',authorized_scope=set()))
 def test_06_matching_scope(self): self.assertEqual(self.o.create(req(actor_person_id='family',subject_person_id='senior')).status,c.CallState.QUEUED)
 def test_07_disclosure_required(self): self.assertTrue(req().disclosure_required)
 def test_08_no_disclosure_stops(self): self.assertEqual(self.o.begin_conversation(req(),self.o.create(req()),c.Disclosure()).status,c.CallState.FAILED)
 def test_09_available(self): self.assertEqual(self.o.evaluate_reservation(req(),c.AvailabilityResult(available=True)),c.CallState.NEEDS_USER_INPUT)
 def test_10_unavailable(self): self.assertEqual(self.o.evaluate_reservation(req(),c.AvailabilityResult(available=False)),c.CallState.COMPLETED)
 def test_11_alternative_times(self): self.assertEqual(c.AvailabilityResult(alternative_times=['19:00']).alternative_times,['19:00'])
 def test_12_fee_needs_input(self): self.assertEqual(self.o.evaluate_reservation(req(parameters={'explicit_auto_reserve':True}),c.AvailabilityResult(True,conditions=['fee'])),c.CallState.NEEDS_USER_INPUT)
 def test_13_deposit_needs_input(self): self.assertEqual(self.o.evaluate_reservation(req(parameters={'explicit_auto_reserve':True}),c.AvailabilityResult(True,deposit_required=True)),c.CallState.NEEDS_USER_INPUT)
 def test_14_card_needs_input(self): self.assertEqual(self.o.evaluate_reservation(req(parameters={'explicit_auto_reserve':True}),c.AvailabilityResult(True,conditions=['credit_card'])),c.CallState.NEEDS_USER_INPUT)
 def test_15_other_time(self): self.assertEqual(self.o.evaluate_reservation(req(parameters={'explicit_auto_reserve':True,'requested_time':'18:00','offered_time':'19:00','requested_party_size':2}),c.AvailabilityResult(True)),c.CallState.NEEDS_USER_INPUT)
 def test_16_auto_reserve(self): self.assertEqual(self.o.evaluate_reservation(req(parameters={'explicit_auto_reserve':True,'requested_time':'18:00','requested_party_size':2}),c.AvailabilityResult(True)),c.CallState.CONFIRMED)
 def test_17_no_answer(self): self.assertEqual(self.o.remote_terminal(self.o.create(req()),'no-answer').status,c.CallState.NO_ANSWER)
 def test_18_busy(self): self.assertEqual(self.o.remote_terminal(self.o.create(req()),'busy').status,c.CallState.BUSY)
 def test_19_voicemail(self): self.assertEqual(self.o.remote_terminal(self.o.create(req()),'voicemail').status,c.CallState.VOICEMAIL)
 def test_20_provider_failure(self):
  class F(c.FixtureVoiceAdapter):
   def create_call(self,r): raise RuntimeError('provider')
  with self.assertRaises(RuntimeError): c.CallOrchestrator(F(),self.a).create(req())
 def test_21_rate_limit(self):
  o=c.CallOrchestrator(self.p,self.a,rate_limit=1); o.create(req())
  with self.assertRaises(RuntimeError): o.create(req(request_id='r2'))
 def test_22_timeout(self):
  with self.assertRaises(ValueError): self.o.create(req(max_call_duration=1801))
 def test_23_ai_failure(self):
  o=c.CallOrchestrator(self.p,c.FixtureRealtimeVoiceAgent(fail=True)); out=o.create(req()); d=c.Disclosure(); d.mark_spoken()
  with self.assertRaises(RuntimeError): o.begin_conversation(req(),out,d)
 def test_24_scope_drift(self):
  with self.assertRaises(PermissionError): self.o.invoke_tool(req(),'confirm_reservation',{})
 def test_25_max_duration(self): self.assertEqual(req(max_call_duration=300).max_call_duration,300)
 def test_26_idempotency(self): self.assertIs(self.o.create(req()),self.o.create(req()))
 def test_27_retry_bounded(self): self.assertEqual([self.o.retry(i) for i in range(4)],[True,True,False,False])
 def test_28_nilo_cedar(self): self.assertEqual(c.voice_for('Nilo'),'cedar')
 def test_29_mira_marin(self): self.assertEqual(c.voice_for('Mira'),'marin')
 def test_30_persona_identity(self): self.assertEqual(req(voice_persona='Mira').subject_person_id,'p1')
 def test_31_no_recording_default(self): self.assertFalse(req().recording_allowed)
 def test_32_transcript_retention(self): self.assertEqual(req(transcript_retention='none').transcript_retention,'none')
 def test_33_no_payment_tool(self):
  with self.assertRaises(PermissionError): self.o.invoke_tool(req(),'payment',{})
 def test_34_human_handoff_state(self):
  self.assertIn(c.CallState.TRANSFERRED,c.TRANSITIONS[c.CallState.IN_CONVERSATION])
 def test_35_whatsapp_result(self):
  r=c.OutboundCallResult('c','r',c.CallState.COMPLETED,structured_result={'available':True}); self.assertIn('bestätigt',c.whatsapp_result(r))
 def test_36_no_real_customer_data(self):
  r=req(); self.assertTrue(all(x.startswith(('p','r')) for x in [r.request_id,r.actor_person_id,r.subject_person_id]))
 def test_disclosure_success_path(self):
  out=self.o.create(req()); d=c.Disclosure(); d.mark_spoken(); out=self.o.begin_conversation(req(),out,d); self.assertEqual(out.status,c.CallState.IN_CONVERSATION)
 def test_transition_guard(self):
  with self.assertRaises(ValueError): self.o.transition(c.CallState.REQUESTED,c.CallState.CONNECTED)
 def test_recording_fail_closed(self):
  with self.assertRaises(PermissionError): self.o.create(req(recording_allowed=True))
 def test_reserve_tool_allowed_only_reserve_scope(self):
  r=req(action_type='restaurant.reserve',authorized_scope={'restaurant.reserve'}); self.assertTrue(self.o.tool_allowed(r,'confirm_reservation'))

if __name__=='__main__': unittest.main(verbosity=2)
