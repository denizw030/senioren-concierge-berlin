import test from "node:test";
import assert from "node:assert/strict";
import {activeOutboundMissionsV1,boundLiveTranscriptV1} from "../assets/stewaro-outbound-live-state-v1.mjs";
const id="18a7b27a-b143-42d3-8d9c-e5fdc79e0256";
test("only bound active or queued calls are shown, never unbound or completed",()=>{
 const calls=[{call_id:id,job_bound:true,call_status:"Anruf läuft",contact_name:"Praxis",requested_objective:"Termin erfragen"},
 {call_id:"b2d87282-9361-440d-a7fa-8409cd0ac6b3",job_bound:false,call_status:"Anruf läuft"},
 {call_id:"9855d21a-e188-4a0f-bb1a-f23d0abfd4ee",job_bound:true,call_status:"Telefonat beendet"},
 {call_id:"8c3c7fef-3871-46c3-b9f4-5e69518a78d9",job_bound:true,call_status:"Vorgemerkt"}];
 const selected=activeOutboundMissionsV1(calls);
 assert.equal(selected.length,2);assert.equal(selected[0].call_id,id);
 assert.equal(selected[0].mission_verified,false);
 assert.equal(activeOutboundMissionsV1([{call_id:"unsafe",job_bound:true,call_status:"Anruf läuft"}]).length,0);
});
test("transcript requires an exact call ID and does not infer speech",()=>{
 const envelope={call:{call_id:id,transcript:[{speaker:"Camille",text:"Guten Tag."},{speaker:"Angerufene Person",text:"Ja."}]}};
 assert.equal(boundLiveTranscriptV1(id,envelope)?.length,2);
 assert.equal(boundLiveTranscriptV1("8c3c7fef-3871-46c3-b9f4-5e69518a78d9",envelope),null);
 assert.deepEqual(boundLiveTranscriptV1(id,{call:{call_id:id,transcript:[]}}),[]);
});
