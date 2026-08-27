import unittest
from datetime import datetime, timedelta, timezone
from dataclasses import replace

from local_intelligence.restaurant_execution import (
    AttemptChannel, ExecutionCandidate, ExecutionLimits, JobState,
    begin_attempt, confirm, create_job, execution_expired, job_from_record,
    job_to_record, online_first_channel, set_approval, transition_job,
    voice_fallback_contract,
)


def base_job(limits=None):
    job=create_job(account_id="acct",member_ref="member",tenant_id="tenant",criteria={"location":"12207","cuisine":"italian","date":"2026-08-29","time":"19:00","party_size":4},constraints={"allowed_time_window":("18:30","20:00")},limits=limits)
    job.status=JobState.CANDIDATES_FOUND
    job.candidate_list=[ExecutionCandidate("c1","Roma Test","r1","Teststr. 1",1,4.5,1.0,True,False,"030123")]
    job.current_candidate=0
    return job


class ExecutionSafetyTests(unittest.TestCase):
    def test_approval_bypass_blocked(self):
        job=base_job(); transition_job(job,JobState.CHECKING_ONLINE); transition_job(job,JobState.BOOKING_ONLINE)
        with self.assertRaises(PermissionError): confirm(job,provider_reference="P")

    def test_persistence_roundtrip(self):
        job=base_job(); record=job_to_record(job); restored=job_from_record(record)
        self.assertEqual((restored.job_id,restored.reservation_id,restored.status,restored.candidate_list[0].candidate_id),(job.job_id,job.reservation_id,job.status,"c1"))

    def test_voice_contract_has_reservation_and_idempotency(self):
        job=base_job(); transition_job(job,JobState.CALLING); contract=voice_fallback_contract(job,"Synthetic Customer")
        self.assertEqual(contract.payload["reservation_id"],job.reservation_id); self.assertTrue(contract.payload["idempotency_key"]); self.assertFalse(contract.execute)

    def test_global_timeout_blocks_attempt(self):
        job=base_job(ExecutionLimits(global_timeout_seconds=1)); job.created_at=(datetime.now(timezone.utc)-timedelta(seconds=5)).isoformat(); transition_job(job,JobState.CALLING)
        self.assertTrue(execution_expired(job))
        with self.assertRaises(RuntimeError): begin_attempt(job,AttemptChannel.VOICE)
        self.assertEqual(job.status,JobState.FAILED)
        self.assertTrue(any(e["event"]=="restaurant_failed" for e in job.audit))

    def test_api_precedes_online(self):
        candidate=replace(base_job().candidate_list[0],api_reservation_capability=True)
        self.assertEqual(online_first_channel(candidate),AttemptChannel.API)


if __name__=="__main__": unittest.main()
