const MODES = Object.freeze(['TAXI','RIDE_HAILING','CHAUFFEUR','PUBLIC_TRANSPORT','RAIL','ACCESSIBLE_TRANSPORT','MEDICAL_TRANSPORT_INFORMATION','WALKING','MIXED']);
const ACCESSIBILITY = Object.freeze(['NONE','LIMITED_WALKING','ROLLATOR','WHEELCHAIR','WHEELCHAIR_TRANSFERABLE','NO_STAIRS','LOW_ENTRY','ASSISTANCE_REQUIRED']);
const PRICE_TYPES = Object.freeze(['FIXED','ESTIMATE','METERED','UNKNOWN']);
const STATES = Object.freeze(['INFORMATION','PREPARE','APPROVE','EXECUTE','NEEDS_USER_INPUT','BLOCKED']);

function mobilityRequest(input={}) {
  return {
    request_id: input.request_id || crypto.randomUUID(), actor_person_id: input.actor_person_id || null,
    subject_person_id: input.subject_person_id || input.actor_person_id || null, account_id: input.account_id || null,
    origin: input.origin || null, destination: input.destination || null, departure_time: input.departure_time || null,
    arrival_time: input.arrival_time || null, passenger_count: input.passenger_count || 1,
    mobility_mode_preferences: input.mobility_mode_preferences || [], accessibility_requirements: input.accessibility_requirements || [],
    luggage: input.luggage || null, pet: input.pet || null, child_seat: input.child_seat || null,
    max_price: input.max_price ?? null, max_walk_distance: input.max_walk_distance ?? null, max_transfers: input.max_transfers ?? null,
    preferred_providers: input.preferred_providers || [], authorization_context: input.authorization_context || null,
    source_channel: input.source_channel || 'UNKNOWN', created_at: input.created_at || new Date().toISOString()
  };
}

function normalizeOption(o={}) {
  return { provider:o.provider||'UNKNOWN', mode:o.mode, pickup:o.pickup||null, destination:o.destination||null,
    estimated_departure:o.estimated_departure||null, estimated_arrival:o.estimated_arrival||null, duration:o.duration??null,
    price:o.price??null, currency:o.currency||'EUR', price_type:o.price_type||'UNKNOWN', availability:o.availability||'UNKNOWN',
    accessibility:o.accessibility||[], transfers:o.transfers??0, walking_distance:o.walking_distance??0,
    cancellation_terms:o.cancellation_terms||null, booking_method:o.booking_method||'NONE', provider_metadata:o.provider_metadata||{},
    confidence:o.confidence??0.5, commission:o.commission??0 };
}

function hasScope(req, scope) {
  if (!req.actor_person_id || req.actor_person_id === req.subject_person_id) return true;
  return Boolean(req.authorization_context?.scopes?.includes(scope));
}

function validateRequest(req, phase='information') {
  if (!req.origin) return {state:'NEEDS_USER_INPUT', reason:'ORIGIN_UNCLEAR'};
  if (!req.destination) return {state:'NEEDS_USER_INPUT', reason:'DESTINATION_UNCLEAR'};
  if (!hasScope(req, `mobility.${phase}`)) return {state:'BLOCKED', reason:'AUTHORIZATION_REQUIRED'};
  return {state:'PREPARE'};
}

function hardConstraints(req, option) {
  const missing = req.accessibility_requirements.filter(r => !option.accessibility.includes(r));
  if (missing.length) return {ok:false, reason:'ACCESSIBILITY_UNMET', missing};
  if (req.max_price != null && option.price != null && option.price > req.max_price) return {ok:false, reason:'PRICE_LIMIT'};
  if (req.max_walk_distance != null && option.walking_distance > req.max_walk_distance) return {ok:false, reason:'WALK_LIMIT'};
  if (req.max_transfers != null && option.transfers > req.max_transfers) return {ok:false, reason:'TRANSFER_LIMIT'};
  return {ok:true};
}

function rankOptions(req, options, objective='passend') {
  const valid = options.map(normalizeOption).filter(o => hardConstraints(req,o).ok && o.availability !== 'UNAVAILABLE');
  const score = o => {
    if (objective==='am günstigsten') return o.price == null ? Infinity : o.price;
    if (objective==='am schnellsten') return o.duration == null ? Infinity : o.duration;
    if (objective==='möglichst wenig laufen') return o.walking_distance;
    if (objective==='am einfachsten') return o.transfers*10000 + o.walking_distance;
    return -(o.confidence*100) + o.transfers*3 + o.walking_distance/1000 + (o.price??0)/100;
  };
  return valid.sort((a,b)=>score(a)-score(b)).slice(0,3);
}

function prepareBooking(req, option, {executeEnabled=false}={}) {
  const v=validateRequest(req,'prepare'); if(v.state!=='PREPARE') return v;
  const o=normalizeOption(option), hc=hardConstraints(req,o); if(!hc.ok) return {state:'NEEDS_USER_INPUT',reason:hc.reason};
  if(o.mode==='MEDICAL_TRANSPORT_INFORMATION') return {state:'INFORMATION',reason:'MEDICAL_INFORMATION_ONLY'};
  if(['CARD_REQUIRED','CREDIT_CARD_REQUIRED'].includes(o.booking_method)) return {state:'BLOCKED',reason:'PAYMENT_RISK_GATE'};
  return {state:'APPROVE', execute_enabled:executeEnabled, option:o};
}

function approveBooking(req, prepared, approval={}) {
  if(prepared.state!=='APPROVE') return prepared;
  if(!hasScope(req,'mobility.book')) return {state:'BLOCKED',reason:'AUTHORIZATION_REQUIRED'};
  const o=prepared.option;
  if(approval.max_price!=null && o.price!=null && o.price>approval.max_price) return {state:'NEEDS_USER_INPUT',reason:'PRICE_CHANGED'};
  if(approval.vehicle_requirements && approval.vehicle_requirements.some(x=>!o.accessibility.includes(x))) return {state:'NEEDS_USER_INPUT',reason:'VEHICLE_CHANGED'};
  return prepared.execute_enabled ? {state:'EXECUTE', option:o} : {state:'APPROVE',reason:'EXECUTE_DISABLED',option:o};
}

function providerCapabilities(p={}) { return {search:Boolean(p.search_options),details:Boolean(p.get_option_details),availability:Boolean(p.check_availability),prepare:Boolean(p.prepare_booking),confirm:Boolean(p.confirm_booking),cancel:Boolean(p.cancel_booking)}; }
function fallbackFor(option) { if(option.booking_method==='OUTBOUND_CALL') return 'OUTBOUND_CALL'; if(option.booking_method==='DEEP_LINK') return 'DEEP_LINK'; return 'ALTERNATIVE_PROVIDER'; }
function priceLabel(o) { o=normalizeOption(o); if(o.price_type==='FIXED') return `${o.price} ${o.currency} Festpreis`; if(o.price_type==='ESTIMATE') return `ca. ${o.price} ${o.currency}`; if(o.price_type==='METERED') return 'Taxameter / variabel'; return 'Preis unbekannt'; }
function dedupe(options){ const seen=new Set(); return options.filter(o=>{const k=[o.provider,o.mode,o.pickup,o.destination,o.estimated_departure].join('|'); if(seen.has(k)) return false; seen.add(k); return true;}); }
function audit(event, data={}) { return {event, at:new Date().toISOString(), ...data}; }
function reminderHook(req, minutes=15){ return {type:'REMINDER_REQUEST',request_id:req.request_id,minutes_before:minutes}; }
function safetyHook(req){ return {type:'ARRIVAL_CHECK_REQUEST',request_id:req.request_id,subject_person_id:req.subject_person_id}; }
function memoryPreferences(memory={}){ return {accessibility_requirements:memory.accessibility_requirements||[],max_walk_distance:memory.max_walk_distance??null,preferred_providers:memory.preferred_providers||[]}; }
function seniorSummary(options){ return options.slice(0,3).map((o,i)=>`${i+1}. ${o.mode} – ${priceLabel(o)}`).join('\n'); }

module.exports={MODES,ACCESSIBILITY,PRICE_TYPES,STATES,mobilityRequest,normalizeOption,hasScope,validateRequest,hardConstraints,rankOptions,prepareBooking,approveBooking,providerCapabilities,fallbackFor,priceLabel,dedupe,audit,reminderHook,safetyHook,memoryPreferences,seniorSummary};
