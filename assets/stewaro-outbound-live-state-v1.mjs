// Mission v1: pure read-only state projection from the existing authenticated ledger.
// This module cannot place calls, join conferences, or authorize a mission.
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isLiveCall = call => call?.job_bound === true && call?.call_status === "Anruf läuft";
export const isQueuedCall = call => call?.job_bound === true && call?.call_status === "Vorgemerkt";
export const hasVerifiedCallId = call => UUID.test(String(call?.call_id ?? ""));
export function activeOutboundMissionsV1(calls){
 if(!Array.isArray(calls))return [];
 return calls.filter(c=>hasVerifiedCallId(c)&&(isLiveCall(c)||isQueuedCall(c)))
  .slice(0,10).map(c=>({
   call_id:c.call_id,status:c.call_status,contact_name:String(c.contact_name??"Kontakt").slice(0,160),
   objective:String(c.requested_objective??"").slice(0,3000),
   assistant_name:c.assistant_name?String(c.assistant_name).slice(0,80):null,
   started_at:c.call_started_at??null,
   mission_verified:false
  }));
}
export function boundLiveTranscriptV1(callId,response){
 if(!UUID.test(String(callId??""))||response?.call?.call_id!==callId)return null;
 const rows=Array.isArray(response.call.transcript)?response.call.transcript:[];
 return rows.slice(-100).filter(row=>typeof row?.text==="string"&&row.text.trim())
  .map(row=>({speaker:String(row.speaker??"Gespräch").slice(0,80),text:row.text.slice(0,12000)}));
}
