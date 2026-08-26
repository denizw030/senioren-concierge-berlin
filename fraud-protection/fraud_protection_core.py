from __future__ import annotations
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Mapping, Protocol, Sequence
from urllib.parse import urlparse
import re

class RiskLevel(str, Enum):
    SAFE="SAFE"; LOW="LOW"; SUSPICIOUS="SUSPICIOUS"; HIGH="HIGH"; CRITICAL="CRITICAL"; UNKNOWN="UNKNOWN"
class Confidence(str, Enum):
    HIGH="HIGH"; MEDIUM="MEDIUM"; LOW="LOW"
class Severity(str, Enum):
    LOW="LOW"; MEDIUM="MEDIUM"; HIGH="HIGH"; CRITICAL="CRITICAL"

@dataclass(frozen=True)
class FraudSignal:
    kind: str
    source: str
    evidence: str
    confidence: Confidence
    severity: Severity

@dataclass(frozen=True)
class FraudAnalysisRequest:
    request_id: str
    actor_person_id: str
    subject_person_id: str
    account_id: str
    source_channel: str
    content_type: str
    sender_context: Mapping[str, Any] = field(default_factory=dict)
    extracted_signals: Sequence[FraudSignal] = field(default_factory=tuple)
    user_context: Mapping[str, Any] = field(default_factory=dict)
    authorization_context: Mapping[str, Any] = field(default_factory=dict)
    created_at: str = ""

@dataclass(frozen=True)
class DocumentFacts:
    issuer: str|None=None; invoice_number: str|None=None; amount: str|None=None
    due_date: str|None=None; iban: str|None=None; payment_reference: str|None=None
    claimed_contract: str|None=None; extracted_urls: tuple[str,...]=()

@dataclass(frozen=True)
class ProviderFinding:
    signals: tuple[FraudSignal,...]=()
    available: bool=True

class FraudIntelligenceProvider(Protocol):
    def check_url(self, value: str) -> ProviderFinding: ...
    def check_domain(self, value: str) -> ProviderFinding: ...
    def check_phone(self, value: str) -> ProviderFinding: ...
    def check_sender(self, value: str) -> ProviderFinding: ...
    def check_payment_destination(self, value: str) -> ProviderFinding: ...

class FixtureFraudProvider:
    """Deterministic fixtures only. Never represents a live provider."""
    def __init__(self, findings: Mapping[str, ProviderFinding]|None=None): self.findings=dict(findings or {})
    def _get(self,k,v): return self.findings.get(f"{k}:{v}", ProviderFinding())
    def check_url(self,v): return self._get("url",v)
    def check_domain(self,v): return self._get("domain",v)
    def check_phone(self,v): return self._get("phone",v)
    def check_sender(self,v): return self._get("sender",v)
    def check_payment_destination(self,v): return self._get("payment",v)

class ExternalFraudProvider:
    """Boundary for a future real adapter; deliberately not implemented."""
    def _no(self,*_): raise NotImplementedError("No live fraud provider configured")
    check_url=check_domain=check_phone=check_sender=check_payment_destination=_no

@dataclass(frozen=True)
class FraudResult:
    risk_level: RiskLevel
    confidence: Confidence
    short_explanation: str
    detected_signals: tuple[FraudSignal,...]
    recommended_next_steps: tuple[str,...]
    safe_to_interact: bool
    escalation_recommended: bool
    audit_events: tuple[Mapping[str,Any],...]
    action_approval_hook: Mapping[str,Any]

PATTERNS = (
 ("URGENCY", r"\b(sofort|dringend|heute noch|unverzüglich|immediately|urgent)\b", Severity.HIGH),
 ("PAYMENT_REQUEST", r"\b(überweis|bezahlen|zahlung|geld|pay|payment)\w*", Severity.HIGH),
 ("NEW_PHONE_NUMBER", r"\b(neue nummer|new number)\b", Severity.HIGH),
 ("CREDENTIAL_REQUEST", r"\b(passwort|password|zugangsdaten|login)\b", Severity.CRITICAL),
 ("OTP_REQUEST", r"\b(otp|einmalcode|verification code)\b", Severity.CRITICAL),
 ("OTP_REQUEST", r"\b(tan|pin)\b", Severity.CRITICAL),
 ("REMOTE_ACCESS_REQUEST", r"\b(anydesk|teamviewer|fernzugriff|remote access)\b", Severity.CRITICAL),
 ("SECRECY_REQUEST", r"\b(niemandem sagen|geheim|don't tell|keep secret)\b", Severity.HIGH),
 ("GIFT_CARD_PAYMENT", r"\b(gutscheinkarte|gift card|itunes karte|google play karte)\b", Severity.CRITICAL),
 ("CRYPTO_PAYMENT", r"\b(bitcoin|krypto|crypto|usdt)\b", Severity.CRITICAL),
 ("THREAT", r"\b(haftbefehl|sperrung|strafe|arrest|account suspended)\b", Severity.HIGH),
 ("AUTHORITY_PRESSURE", r"\b(polizei|staatsanwaltschaft|finanzamt|behörde|police)\b", Severity.HIGH),
 ("CALLBACK_REQUEST", r"\b(rufen sie|ruf mich|call back|rückruf)\b", Severity.MEDIUM),
 ("IMPERSONATION", r"\b(ich bin dein (sohn|tochter|enkel|enkelin)|chef|ceo)\b", Severity.HIGH),
)
SHORTENERS={"bit.ly","tinyurl.com","t.co","goo.gl","is.gd","cutt.ly"}
KNOWN_BRANDS={"paypal":["paypa1","pay-pal"],"sparkasse":["sparkase","sp4rkasse"],"amazon":["arnazon","amaz0n"]}

def _signal(kind, evidence, severity, source="content", confidence=Confidence.MEDIUM):
    return FraudSignal(kind, source, evidence[:120], confidence, severity)

def analyze_url(url: str) -> tuple[FraudSignal,...]:
    out=[]; raw=url.strip()
    try:
        parsed=urlparse(raw if "://" in raw else "//"+raw)
        host=(parsed.hostname or "").lower()
    except Exception: host=""
    if not host: return (_signal("SUSPICIOUS_LINK","URL could not be parsed",Severity.HIGH,"url",Confidence.LOW),)
    if raw.startswith("http://"): out.append(_signal("SUSPICIOUS_LINK","URL does not use HTTPS",Severity.MEDIUM,"url"))
    if host.startswith("xn--") or ".xn--" in host: out.append(_signal("LOOKALIKE_DOMAIN","Punycode/IDN domain",Severity.HIGH,"url"))
    if host in SHORTENERS: out.append(_signal("SHORT_URL","Shortened URL",Severity.HIGH,"url",Confidence.HIGH))
    for brand, variants in KNOWN_BRANDS.items():
        if any(v in host for v in variants):
            out.append(_signal("LOOKALIKE_DOMAIN",f"Domain resembles {brand}",Severity.HIGH,"url",Confidence.MEDIUM))
    return tuple(out)

def _audit(signals, risk, escalation, provider_failure=False):
    events=[{"event":"analysis_requested"},{"event":"signals_detected","signal_types":tuple(s.kind for s in signals),"count":len(signals)},{"event":"risk_assessed","risk_level":risk.value}]
    if escalation: events.append({"event":"escalation_recommended"})
    if provider_failure: events.append({"event":"provider_failure"})
    return tuple(events)

class FraudProtectionCore:
    def __init__(self, provider: FraudIntelligenceProvider|None=None): self.provider=provider
    def analyze(self, req: FraudAnalysisRequest, content: str="", document: DocumentFacts|None=None, urls: Sequence[str]=(), qr_target: str|None=None) -> FraudResult:
        text=(content or "").lower(); signals=list(req.extracted_signals)
        for kind, pattern, sev in PATTERNS:
            if re.search(pattern,text,re.I): signals.append(_signal(kind,kind.replace("_"," ").title(),sev))
        if re.search(r"\b(bank|sparkasse|paypal|payment support)\b",text,re.I): signals.append(_signal("IMPERSONATION","Claimed bank/payment identity",Severity.HIGH))
        if re.search(r"\b(rechnung|invoice)\b",text,re.I) and req.user_context.get("expected_invoice") is False: signals.append(_signal("UNEXPECTED_INVOICE","Unexpected invoice",Severity.HIGH))
        if re.search(r"\b(mahnung|inkasso|collection)\b",text,re.I): signals.append(_signal("THREAT","Unexpected demand/collection pressure",Severity.HIGH))
        if re.search(r"\b(paket|dhl|ups|hermes)\b",text,re.I) and re.search(r"\b(link|gebühr|fee|zahlen)\b",text,re.I): signals.append(_signal("IMPERSONATION","Parcel-service claim with action request",Severity.HIGH))
        if req.sender_context.get("unknown_sender"): signals.append(_signal("UNKNOWN_SENDER","Sender is not known",Severity.MEDIUM))
        if req.sender_context.get("identity_inconsistent"): signals.append(_signal("INCONSISTENT_IDENTITY","Identity details are inconsistent",Severity.HIGH))
        if document:
            if document.iban and req.user_context.get("known_iban") and document.iban != req.user_context.get("known_iban"): signals.append(_signal("BANK_ACCOUNT_CHANGE","Invoice payment destination changed",Severity.CRITICAL,"document",Confidence.HIGH))
            urls=tuple(urls)+document.extracted_urls
        all_urls=list(urls)
        if qr_target: all_urls.append(qr_target); signals.append(_signal("QR_PAYMENT","QR target supplied for analysis only",Severity.MEDIUM,"qr",Confidence.MEDIUM))
        provider_failure=False
        for url in all_urls:
            signals.extend(analyze_url(url))
            if self.provider:
                try:
                    f=self.provider.check_url(url); signals.extend(f.signals); provider_failure |= not f.available
                except Exception: provider_failure=True
        kinds={s.kind for s in signals}
        critical_combo = ({"PAYMENT_REQUEST","OTP_REQUEST"} <= kinds or {"REMOTE_ACCESS_REQUEST","IMPERSONATION"} <= kinds or "CREDENTIAL_REQUEST" in kinds or "GIFT_CARD_PAYMENT" in kinds or "CRYPTO_PAYMENT" in kinds or "BANK_ACCOUNT_CHANGE" in kinds or "OTP_REQUEST" in kinds)
        high_combo = ({"NEW_PHONE_NUMBER","PAYMENT_REQUEST"} <= kinds or {"IMPERSONATION","PAYMENT_REQUEST"} <= kinds or {"URGENCY","PAYMENT_REQUEST"} <= kinds or "REMOTE_ACCESS_REQUEST" in kinds or "OTP_REQUEST" in kinds)
        if critical_combo: risk=RiskLevel.CRITICAL
        elif high_combo: risk=RiskLevel.HIGH
        elif any(s.severity in (Severity.HIGH,Severity.CRITICAL) for s in signals): risk=RiskLevel.SUSPICIOUS
        elif signals: risk=RiskLevel.LOW
        elif req.user_context.get("known_safe_fixture") is True: risk=RiskLevel.SAFE
        else: risk=RiskLevel.UNKNOWN
        if provider_failure: confidence=Confidence.LOW
        elif risk==RiskLevel.UNKNOWN: confidence=Confidence.LOW
        elif any(s.confidence==Confidence.HIGH for s in signals) or len(signals)>=2: confidence=Confidence.HIGH
        else: confidence=Confidence.MEDIUM
        unsafe=risk in (RiskLevel.SUSPICIOUS,RiskLevel.HIGH,RiskLevel.CRITICAL,RiskLevel.UNKNOWN)
        if unsafe:
            steps=["Bitte antworten Sie vorerst nicht.","Öffnen Sie keine Links und zahlen Sie noch nichts.","Geben Sie keine PIN, TAN, OTP oder Passwörter weiter."]
            if "IMPERSONATION" in kinds or "NEW_PHONE_NUMBER" in kinds: steps.append("Kontaktieren Sie die Person über eine bereits bekannte, unabhängige Nummer.")
            if "BANK_ACCOUNT_CHANGE" in kinds or ("IMPERSONATION" in kinds and "PAYMENT_REQUEST" in kinds): steps.append("Kontaktieren Sie die Bank oder den Anbieter nur über offiziell bekannte Kontaktdaten.")
            steps.append("Fordern Sie bei Bedarf eine menschliche Prüfung an.")
        else: steps=["Es wurden in den vorliegenden Daten keine deutlichen Warnsignale erkannt. Bleiben Sie bei unerwarteten Forderungen vorsichtig."]
        if risk==RiskLevel.SAFE: explanation="In den bereitgestellten Prüfdaten wurden keine Warnsignale erkannt."
        elif risk==RiskLevel.UNKNOWN: explanation="Die vorliegenden Informationen reichen nicht aus, um den Inhalt als sicher einzustufen."
        else: explanation=f"Das wirkt verdächtig. Auffällig sind: {', '.join(dict.fromkeys(s.kind.replace('_',' ').lower() for s in signals[:3]))}."
        escalation=risk in (RiskLevel.HIGH,RiskLevel.CRITICAL) or confidence==Confidence.LOW
        hook={"stage":"INFORMATION","automatic_external_action":False,"required_for_actions":"central_action_approval_core"}
        return FraudResult(risk,confidence,explanation,tuple(signals),tuple(steps),not unsafe,escalation,_audit(signals,risk,escalation,provider_failure),hook)

def family_content_access(authorization_context: Mapping[str,Any]) -> bool:
    return bool(authorization_context.get("fraud_private_content_scope") is True)

def memory_authenticity(memory_match: bool) -> str:
    return "context_only_not_proof" if memory_match else "no_memory_proof"
