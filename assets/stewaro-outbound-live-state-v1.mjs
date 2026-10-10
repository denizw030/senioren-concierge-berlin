export const isLiveCall = call => call?.job_bound === true && call?.call_status === 'Anruf läuft';
export const isQueuedCall = call => call?.job_bound === true && call?.call_status === 'Vorgemerkt';
export const hasVerifiedCallId = call => /^[0-9a-f]{8}-[0-9a-f-]{27,}$/i.test(String(call?.call_id ?? ''));
