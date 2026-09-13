from __future__ import annotations

from pathlib import Path
from html import escape
import re

DOMAIN = "https://nahwerkconcierge.com"
ROOT = Path(__file__).resolve().parents[1]

PAGES = [
    "index.html",
    "prime-concierge.html",
    "safety.html",
    "angehoerige.html",
    "telefonannahme.html",
    "pakete.html",
    "leistungen.html",
    "ablauf.html",
    "faq.html",
    "kontakt.html",
    "concierges.html",
    "senioren-concierge.html",
    "alltag-organisieren.html",
    "dokumente-verstehen.html",
    "technik-verstehen.html",
    "ueber-mich.html",
]

NAV = {
    "en": {
        "home": "Overview",
        "concierge": "Concierge",
        "safety": "Safety",
        "family": "Family",
        "plans": "Plans",
        "start": "Start free",
        "learn": "Explore services",
        "footer": "Public website in English. Customer and legal surfaces remain on the German PROD flow until separately localized and reviewed.",
    },
    "tr": {
        "home": "Genel bakış",
        "concierge": "Concierge",
        "safety": "Güvenlik",
        "family": "Aile",
        "plans": "Paketler",
        "start": "Ücretsiz başla",
        "learn": "Hizmetleri keşfet",
        "footer": "Herkese açık web sitesi Türkçe sunulmaktadır. Müşteri hesabı ve hukuki sayfalar ayrıca yerelleştirilip incelenene kadar Almanca PROD akışında kalır.",
    },
}

COPY = {
    "en": {
        "index.html": (
            "NAHWERK | Your personal concierge",
            "NAHWERK is your personal AI-supported concierge: it understands requests, organises next steps and gets approved tasks done.",
            "PERSONAL CONCIERGE",
            "Google finds. AI understands. NAHWERK gets it done.",
            "One personal concierge for everyday tasks, organisation, Safety and Family — with clear approvals and simple access through web, WhatsApp and phone.",
            [("Understand", "Explain what you need in your own words. NAHWERK turns it into a clear task."), ("Organise", "The concierge structures the next steps, keeps context and makes progress visible."), ("Execute", "External actions only happen within the permissions and approvals you provide.")],
        ),
        "prime-concierge.html": (
            "Personal Concierge | NAHWERK",
            "Your personal NAHWERK Concierge understands requests, organises next steps and completes approved tasks.",
            "PERSONAL CONCIERGE",
            "A concierge that understands before it acts.",
            "Ask naturally. NAHWERK keeps the context, prepares the right next step and only executes external actions after the required approval.",
            [("One conversation", "Keep different everyday tasks in one continuous concierge conversation."), ("Clear approvals", "You stay in control whenever an action has external consequences."), ("Across channels", "Use the concierge through supported web, WhatsApp and phone experiences.")],
        ),
        "safety.html": (
            "Safety | NAHWERK",
            "NAHWERK Safety provides agreed check-ins and escalation paths for situations where reassurance matters.",
            "NAHWERK SAFETY",
            "There when you cannot be.",
            "Define check-ins, trusted contacts and escalation rules in advance. Safety is designed to support — not replace — emergency services or medical care.",
            [("Check-ins", "Set agreed times and simple confirmation routines."), ("Escalation", "If a response is missing, the configured escalation path can be started."), ("Trusted contacts", "Keep the people who should be contacted in the right order.")],
        ),
        "angehoerige.html": (
            "Family | NAHWERK",
            "NAHWERK Family helps relatives support one another with clearer roles, shared context and controlled access.",
            "NAHWERK FAMILY",
            "Support relatives without coordinating everything manually.",
            "Family access is designed so support can be shared without losing the individual person's privacy, permissions or control.",
            [("Shared support", "Coordinate selected tasks and support responsibilities."), ("Clear roles", "Access and actions follow defined permissions."), ("Less repetition", "Relevant context can stay available instead of being explained again and again.")],
        ),
        "telefonannahme.html": (
            "Phone Concierge | NAHWERK",
            "Use NAHWERK by phone for a natural voice-first concierge experience.",
            "PHONE",
            "Call instead of typing.",
            "The phone experience is designed for natural conversation, clear confirmations and a smooth handover into the same concierge context.",
            [("Natural voice", "Speak normally instead of navigating menus."), ("Same context", "Phone tasks can connect to the same concierge identity and task context."), ("Controlled actions", "Important external actions remain subject to the required confirmation.")],
        ),
        "pakete.html": (
            "Plans & Pricing | NAHWERK",
            "Compare NAHWERK plans from FREE to PREMIUM PLUS and FAMILY.",
            "PLANS",
            "Start free. Upgrade when NAHWERK becomes part of your everyday life.",
            "Choose the level that fits how often you want to use the concierge and which channels and capabilities you need.",
            [("FREE — €0", "A simple way to start and experience real concierge usage."), ("STANDARD — €5.99", "For regular personal concierge support."), ("PLUS — €10.99", "More usage and broader everyday support."), ("PREMIUM — €19.99", "For frequent concierge use and advanced access."), ("PREMIUM PLUS — €34.99", "For intensive use with higher allowances."), ("FAMILY — €59.66", "Shared support for families with managed access.")],
        ),
        "leistungen.html": (
            "Services | NAHWERK",
            "See what the NAHWERK Concierge can help organise, prepare and complete within approved boundaries.",
            "SERVICES",
            "From a request to a useful next step.",
            "NAHWERK is built for practical everyday work: understanding, structuring, preparing and — where supported — executing approved tasks.",
            [("Everyday organisation", "Appointments, errands, comparisons and follow-ups."), ("Information & documents", "Explain content and turn it into understandable next steps."), ("Communication", "Prepare messages, calls and follow-up actions with your approval.")],
        ),
        "ablauf.html": (
            "How it works | NAHWERK",
            "See how a request moves from conversation to approval and execution in NAHWERK.",
            "HOW IT WORKS",
            "Ask. Understand. Approve. Done.",
            "You describe the goal. NAHWERK clarifies what matters, prepares the task and asks for approval when an external action requires it.",
            [("1 — Tell us", "Describe the outcome you want in normal language."), ("2 — Review", "NAHWERK summarises the plan and asks for approval where required."), ("3 — Execute", "Supported actions are carried out and the result is brought back into the conversation.")],
        ),
        "faq.html": (
            "FAQ | NAHWERK",
            "Frequently asked questions about NAHWERK Concierge, approvals, Safety, channels and plans.",
            "FAQ",
            "The important questions, answered clearly.",
            "NAHWERK combines AI-supported conversation with controlled actions. You remain in control of approvals, personal data and the services you choose.",
            [("Is NAHWERK an AI?", "Yes. The concierge uses AI to understand and organise requests, with product rules and approvals around actions."), ("Does it act automatically?", "Not for actions that require your explicit approval or other configured safeguards."), ("Can I start free?", "Yes. The FREE plan is designed to let you try the concierge before upgrading.")],
        ),
        "kontakt.html": (
            "Contact | NAHWERK",
            "Contact NAHWERK Concierge for questions about the product, access or support.",
            "CONTACT",
            "A direct way to reach NAHWERK.",
            "For product questions, access or support, use the official contact options on the German production site.",
            [("Product questions", "Questions about plans, channels or what the concierge can do."), ("Account support", "Help with access or the customer area."), ("Business enquiries", "Partnership and company-related enquiries.")],
        ),
        "concierges.html": (
            "Concierges | NAHWERK",
            "Discover the NAHWERK concierge experience and the personalities designed for different situations.",
            "CONCIERGES",
            "One system. A personality that fits the moment.",
            "NAHWERK is built around one central concierge core while allowing supported personas and voices to feel appropriate for different use cases.",
            [("Personal", "A warm, capable everyday concierge experience."), ("Consistent", "The same task context should remain recognisable across supported channels."), ("Controlled", "Personality never changes the approval and safety rules around actions.")],
        ),
        "senioren-concierge.html": (
            "Senior Concierge | NAHWERK",
            "A clear, accessible NAHWERK concierge experience designed with older users and their families in mind.",
            "SENIOR CONCIERGE",
            "Clear support without unnecessary complexity.",
            "A calmer interface, understandable language and phone-friendly access can make everyday digital tasks easier to handle.",
            [("Simple access", "Use straightforward web and phone-oriented experiences."), ("Clear language", "Requests and next steps are explained without technical jargon."), ("Family support", "Selected relatives can help within defined permissions.")],
        ),
        "alltag-organisieren.html": (
            "Organise everyday life | NAHWERK",
            "Tell NAHWERK what is coming up today and get a clear, prioritised next step.",
            "EVERYDAY ORGANISATION",
            "Sort the day without learning a new system first.",
            "Tell the concierge what is on your mind. NAHWERK can structure tasks, make priorities visible and help you decide what to do next.",
            [("Collect", "Bring scattered tasks into one conversation."), ("Prioritise", "Separate urgent items from things that can wait."), ("Continue", "Turn the overview into the next concrete action.")],
        ),
        "dokumente-verstehen.html": (
            "Understand documents | NAHWERK",
            "NAHWERK helps explain documents in clearer language and identify practical next steps.",
            "DOCUMENTS",
            "Understand what a document is asking from you.",
            "Share the relevant content and NAHWERK can summarise it, explain unfamiliar wording and help prepare the next step.",
            [("Summarise", "Reduce long content to the points that matter."), ("Explain", "Translate complicated wording into clearer language."), ("Prepare", "Turn the explanation into questions or next actions. Professional advice may still be required.")],
        ),
        "technik-verstehen.html": (
            "Understand technology | NAHWERK",
            "Get clear, step-by-step help with everyday technology and digital services.",
            "TECHNOLOGY",
            "Technology explained one step at a time.",
            "Describe what you see and what you are trying to achieve. NAHWERK can guide you through the next sensible step without assuming technical knowledge.",
            [("Describe", "Tell NAHWERK what is on the screen or what is not working."), ("Guide", "Receive focused steps instead of a wall of technical terms."), ("Check", "Confirm the result before moving on to the next step.")],
        ),
        "ueber-mich.html": (
            "About NAHWERK | NAHWERK Concierge",
            "Learn what NAHWERK Concierge is designed to do and the principles behind the service.",
            "ABOUT NAHWERK",
            "A concierge built around understanding, control and useful action.",
            "NAHWERK aims to make AI practical in everyday life: one conversation, clear permissions and a service that focuses on getting useful work done.",
            [("Useful", "The goal is practical progress, not just another answer."), ("Personal", "Context and preferences can make support more relevant over time."), ("Controlled", "Permissions, approvals and product safeguards remain part of the experience.")],
        ),
    },
    "tr": {
        "index.html": (
            "NAHWERK | Kişisel Concierge'iniz",
            "NAHWERK, taleplerinizi anlayan, sonraki adımları düzenleyen ve onaylanan işleri gerçekleştiren kişisel, yapay zekâ destekli Concierge'inizdir.",
            "KİŞİSEL CONCIERGE",
            "Google bulur. Yapay zekâ anlar. NAHWERK halleder.",
            "Günlük işler, organizasyon, Güvenlik ve Aile için tek bir kişisel Concierge — net onaylarla ve web, WhatsApp ve telefon üzerinden kolay erişimle.",
            [("Anlar", "İhtiyacınızı kendi cümlelerinizle anlatın. NAHWERK bunu net bir göreve dönüştürür."), ("Düzenler", "Concierge sonraki adımları yapılandırır, bağlamı korur ve ilerlemeyi görünür kılar."), ("Uygular", "Dış dünyada sonuç doğuran işlemler yalnızca verdiğiniz izin ve onaylar çerçevesinde yapılır.")],
        ),
        "prime-concierge.html": (
            "Kişisel Concierge | NAHWERK",
            "Kişisel NAHWERK Concierge talepleri anlar, sonraki adımları düzenler ve onaylanan işleri tamamlar.",
            "KİŞİSEL CONCIERGE",
            "Harekete geçmeden önce anlayan bir Concierge.",
            "Doğal şekilde sorun. NAHWERK bağlamı korur, doğru sonraki adımı hazırlar ve gerekli onay olmadan dış işlem yapmaz.",
            [("Tek görüşme", "Farklı günlük işleri tek ve devamlı bir Concierge görüşmesinde tutun."), ("Net onaylar", "Dış sonuç doğuran işlemlerde kontrol sizde kalır."), ("Kanallar arası", "Desteklenen web, WhatsApp ve telefon deneyimlerinde aynı Concierge yaklaşımını kullanın.")],
        ),
        "safety.html": (
            "Güvenlik | NAHWERK",
            "NAHWERK Güvenlik, önemli durumlar için önceden belirlenmiş kontrol ve bildirim akışları sunar.",
            "NAHWERK GÜVENLİK",
            "Siz orada olamadığınızda da yanında.",
            "Kontrol saatlerini, güvenilir kişileri ve bildirim sırasını önceden belirleyin. Güvenlik özelliği acil servislerin veya tıbbi bakımın yerine geçmez.",
            [("Kontroller", "Belirlenen saatlerde basit doğrulama rutinleri oluşturun."), ("Bildirim", "Yanıt gelmezse tanımlanmış bildirim akışı başlatılabilir."), ("Güvenilir kişiler", "Kimin hangi sırayla aranacağını önceden belirleyin.")],
        ),
        "angehoerige.html": (
            "Aile | NAHWERK",
            "NAHWERK Aile, yakınların net roller, paylaşılan bağlam ve kontrollü erişimle birbirine destek olmasını kolaylaştırır.",
            "NAHWERK AİLE",
            "Her şeyi tek tek koordine etmeden yakınlarınıza destek olun.",
            "Aile erişimi, destek paylaşılırken kişinin mahremiyetini, izinlerini ve kontrolünü koruyacak şekilde tasarlanır.",
            [("Paylaşılan destek", "Seçili görevleri ve destek sorumluluklarını birlikte yönetin."), ("Net roller", "Erişim ve işlemler tanımlı izinlara göre yürür."), ("Daha az tekrar", "Gerekli bağlamı her seferinde yeniden anlatma ihtiyacını azaltın.")],
        ),
        "telefonannahme.html": (
            "Telefon Concierge | NAHWERK",
            "NAHWERK'ı telefon üzerinden doğal, ses odaklı bir Concierge deneyimiyle kullanın.",
            "TELEFON",
            "Yazmak yerine konuşun.",
            "Telefon deneyimi doğal konuşma, net doğrulamalar ve aynı Concierge bağlamına sorunsuz geçiş için tasarlanır.",
            [("Doğal konuşma", "Menüler yerine normal şekilde konuşun."), ("Aynı bağlam", "Telefon görevleri aynı Concierge kimliği ve görev bağlamıyla ilişkilendirilebilir."), ("Kontrollü işlemler", "Önemli dış işlemler gerekli onaya tabi olmaya devam eder.")],
        ),
        "pakete.html": (
            "Paketler ve Fiyatlar | NAHWERK",
            "FREE'den PREMIUM PLUS ve FAMILY'ye kadar NAHWERK paketlerini karşılaştırın.",
            "PAKETLER",
            "Ücretsiz başlayın. NAHWERK günlük hayatınızın parçası olduğunda yükseltin.",
            "Concierge'i ne kadar sık kullanmak istediğinize, ihtiyaç duyduğunuz kanal ve özelliklere göre uygun paketi seçin.",
            [("FREE — €0", "Gerçek Concierge kullanımını denemek için kolay başlangıç."), ("STANDARD — €5,99", "Düzenli kişisel Concierge desteği için."), ("PLUS — €10,99", "Daha fazla kullanım ve daha geniş günlük destek."), ("PREMIUM — €19,99", "Sık Concierge kullanımı ve gelişmiş erişim için."), ("PREMIUM PLUS — €34,99", "Yüksek kullanım ihtiyacı için daha geniş limitler."), ("FAMILY — €59,66", "Yönetilen erişimle aileler için ortak destek.")],
        ),
        "leistungen.html": (
            "Hizmetler | NAHWERK",
            "NAHWERK Concierge'in onaylanan sınırlar içinde neleri düzenleyebileceğini, hazırlayabileceğini ve tamamlayabileceğini görün.",
            "HİZMETLER",
            "Bir talepten işe yarayan sonraki adıma.",
            "NAHWERK günlük pratik işler için tasarlanır: anlamak, yapılandırmak, hazırlamak ve desteklendiği yerde onaylanan işlemleri gerçekleştirmek.",
            [("Günlük organizasyon", "Randevular, işler, karşılaştırmalar ve takipler."), ("Bilgi ve belgeler", "İçeriği açıklayın ve anlaşılır sonraki adımlara dönüştürün."), ("İletişim", "Mesajları, aramaları ve takip işlemlerini onayınızla hazırlayın.")],
        ),
        "ablauf.html": (
            "Nasıl çalışır | NAHWERK",
            "Bir talebin NAHWERK'ta görüşmeden onaya ve uygulamaya nasıl ilerlediğini görün.",
            "NASIL ÇALIŞIR",
            "Sor. Anla. Onayla. Tamamla.",
            "Hedefinizi anlatın. NAHWERK önemli noktaları netleştirir, görevi hazırlar ve dış işlem gerekiyorsa onayınızı ister.",
            [("1 — Anlatın", "İstediğiniz sonucu normal dilde açıklayın."), ("2 — Kontrol edin", "NAHWERK planı özetler ve gerektiğinde onay ister."), ("3 — Uygulayın", "Desteklenen işlemler gerçekleştirilir ve sonuç görüşmeye geri getirilir.")],
        ),
        "faq.html": (
            "Sık Sorulan Sorular | NAHWERK",
            "NAHWERK Concierge, onaylar, Güvenlik, kanallar ve paketler hakkında sık sorulan sorular.",
            "SSS",
            "Önemli sorulara net cevaplar.",
            "NAHWERK yapay zekâ destekli görüşmeyi kontrollü işlemlerle birleştirir. Onaylar, kişisel veriler ve seçtiğiniz hizmetler üzerindeki kontrol sizde kalır.",
            [("NAHWERK yapay zekâ mı?", "Evet. Concierge talepleri anlamak ve düzenlemek için yapay zekâ kullanır; işlemler ürün kuralları ve onaylarla çevrelenir."), ("Otomatik işlem yapar mı?", "Açık onayınız veya başka güvenlik kuralları gereken işlemleri onaysız yapmaz."), ("Ücretsiz başlayabilir miyim?", "Evet. FREE paket, yükseltmeden önce Concierge'i deneyebilmeniz için tasarlanmıştır.")],
        ),
        "kontakt.html": (
            "İletişim | NAHWERK",
            "Ürün, erişim veya destek soruları için NAHWERK Concierge ile iletişime geçin.",
            "İLETİŞİM",
            "NAHWERK'a doğrudan ulaşmanın yolu.",
            "Ürün soruları, erişim veya destek için Almanca PROD sitesindeki resmi iletişim seçeneklerini kullanın.",
            [("Ürün soruları", "Paketler, kanallar veya Concierge'in yapabilecekleri hakkında sorular."), ("Hesap desteği", "Erişim veya müşteri alanı konusunda yardım."), ("İş birliği", "Ortaklık ve şirketle ilgili talepler.")],
        ),
        "concierges.html": (
            "Concierge'ler | NAHWERK",
            "NAHWERK Concierge deneyimini ve farklı durumlar için tasarlanan kişilikleri keşfedin.",
            "CONCIERGE'LER",
            "Tek sistem. Duruma uygun bir kişilik.",
            "NAHWERK tek bir merkezi Concierge çekirdeği üzerine kurulur; desteklenen persona ve sesler farklı kullanım durumlarına uygun hissedebilir.",
            [("Kişisel", "Sıcak ve yetkin bir günlük Concierge deneyimi."), ("Tutarlı", "Aynı görev bağlamı desteklenen kanallarda tanınabilir kalmalıdır."), ("Kontrollü", "Kişilik, işlemlerdeki onay ve güvenlik kurallarını değiştirmez.")],
        ),
        "senioren-concierge.html": (
            "Senior Concierge | NAHWERK",
            "İleri yaştaki kullanıcılar ve aileleri düşünülerek tasarlanmış sade ve erişilebilir NAHWERK Concierge deneyimi.",
            "SENIOR CONCIERGE",
            "Gereksiz karmaşa olmadan anlaşılır destek.",
            "Daha sakin bir arayüz, anlaşılır dil ve telefon dostu erişim günlük dijital işleri daha kolay hale getirebilir.",
            [("Kolay erişim", "Basit web ve telefon odaklı deneyimleri kullanın."), ("Anlaşılır dil", "Talepler ve sonraki adımlar teknik jargon olmadan açıklanır."), ("Aile desteği", "Seçili yakınlar tanımlı izinlar içinde yardımcı olabilir.")],
        ),
        "alltag-organisieren.html": (
            "Günlük hayatı düzenle | NAHWERK",
            "Bugün yapılacakları NAHWERK'a anlatın ve net, önceliklendirilmiş bir sonraki adım alın.",
            "GÜNLÜK ORGANİZASYON",
            "Önce yeni bir sistem öğrenmeden günü düzenleyin.",
            "Aklınızdakileri Concierge'e anlatın. NAHWERK görevleri yapılandırabilir, öncelikleri görünür hale getirebilir ve sıradaki adıma karar vermenize yardımcı olabilir.",
            [("Toplayın", "Dağınık görevleri tek görüşmede bir araya getirin."), ("Önceliklendirin", "Acil işleri bekleyebileceklerden ayırın."), ("Devam edin", "Genel görünümü somut bir sonraki işleme dönüştürün.")],
        ),
        "dokumente-verstehen.html": (
            "Belgeleri anla | NAHWERK",
            "NAHWERK belgeleri daha anlaşılır dille açıklamaya ve pratik sonraki adımları belirlemeye yardımcı olur.",
            "BELGELER",
            "Bir belgenin sizden ne istediğini anlayın.",
            "İlgili içeriği paylaşın; NAHWERK özetleyebilir, bilinmeyen ifadeleri açıklayabilir ve sonraki adımı hazırlamanıza yardımcı olabilir.",
            [("Özetle", "Uzun içeriği önemli noktalara indirgeyin."), ("Açıkla", "Karmaşık ifadeleri daha anlaşılır dile dönüştürün."), ("Hazırla", "Açıklamayı sorulara veya sonraki adımlara çevirin. Gerektiğinde profesyonel danışmanlık alın.")],
        ),
        "technik-verstehen.html": (
            "Teknolojiyi anla | NAHWERK",
            "Günlük teknoloji ve dijital hizmetler için açık, adım adım yardım alın.",
            "TEKNOLOJİ",
            "Teknoloji, adım adım açıklansın.",
            "Ekranda ne gördüğünüzü ve ne yapmak istediğinizi anlatın. NAHWERK teknik bilgi varsaymadan mantıklı sonraki adımda size rehberlik edebilir.",
            [("Anlatın", "Ekranda ne olduğunu veya neyin çalışmadığını söyleyin."), ("Rehberlik alın", "Teknik terimler yığını yerine odaklı adımlar alın."), ("Kontrol edin", "Bir sonraki adıma geçmeden önce sonucu doğrulayın.")],
        ),
        "ueber-mich.html": (
            "NAHWERK Hakkında | NAHWERK Concierge",
            "NAHWERK Concierge'in ne için tasarlandığını ve hizmetin temel ilkelerini öğrenin.",
            "NAHWERK HAKKINDA",
            "Anlama, kontrol ve faydalı eylem üzerine kurulmuş bir Concierge.",
            "NAHWERK, yapay zekâyı günlük hayatta pratik hale getirmeyi amaçlar: tek görüşme, net izinlar ve gerçekten iş bitirmeye odaklanan bir hizmet.",
            [("Faydalı", "Hedef sadece cevap vermek değil, pratik ilerleme sağlamaktır."), ("Kişisel", "Bağlam ve tercihler zamanla desteği daha ilgili hale getirebilir."), ("Kontrollü", "İzinlar, onaylar ve ürün güvenlik kuralları deneyimin parçası olarak kalır.")],
        ),
    },
}


def page_url(lang: str, page: str) -> str:
    if lang == "de":
        return f"{DOMAIN}/" if page == "index.html" else f"{DOMAIN}/{page}"
    return f"{DOMAIN}/{lang}/" if page == "index.html" else f"{DOMAIN}/{lang}/{page}"


def hreflang_block(page: str) -> str:
    return "\n".join([
        "    <!-- NW-I18N-START -->",
        f'    <link rel="alternate" hreflang="de" href="{page_url("de", page)}" />',
        f'    <link rel="alternate" hreflang="en" href="{page_url("en", page)}" />',
        f'    <link rel="alternate" hreflang="tr" href="{page_url("tr", page)}" />',
        f'    <link rel="alternate" hreflang="x-default" href="{page_url("de", page)}" />',
        '    <script src="/assets/language-switcher.js?v=1" defer></script>',
        "    <!-- NW-I18N-END -->",
    ])


def inject_root_i18n(page: str) -> None:
    path = ROOT / page
    if not path.exists():
        raise SystemExit(f"Missing root page: {page}")
    text = path.read_text(encoding="utf-8")
    block = hreflang_block(page)
    pattern = re.compile(r"\s*<!-- NW-I18N-START -->.*?<!-- NW-I18N-END -->\s*", re.S)
    if pattern.search(text):
        text = pattern.sub("\n" + block + "\n", text, count=1)
    elif "</head>" in text:
        text = text.replace("</head>", block + "\n  </head>", 1)
    else:
        raise SystemExit(f"No </head> in {page}")
    path.write_text(text, encoding="utf-8")


def nav_html(lang: str, active: str) -> str:
    n = NAV[lang]
    links = [
        ("index.html", n["home"]),
        ("prime-concierge.html", n["concierge"]),
        ("safety.html", n["safety"]),
        ("angehoerige.html", n["family"]),
        ("pakete.html", n["plans"]),
    ]
    rendered = []
    for page, label in links:
        href = "./" if page == "index.html" else page
        cls = ' class="active"' if page == active else ""
        rendered.append(f'<a href="{href}"{cls}>{escape(label)}</a>')
    return "".join(rendered)


def localized_page(lang: str, page: str) -> str:
    title, desc, eyebrow, h1, lead, cards = COPY[lang][page]
    n = NAV[lang]
    locale = "en_GB" if lang == "en" else "tr_TR"
    alt_locale = "tr_TR" if lang == "en" else "en_GB"
    card_html = "".join(
        f'<article class="card"><span>{i:02d}</span><h3>{escape(head)}</h3><p>{escape(body)}</p></article>'
        for i, (head, body) in enumerate(cards, 1)
    )
    section_title = "What NAHWERK focuses on" if lang == "en" else "NAHWERK neye odaklanır"
    section_lead = "Designed for practical progress with clear control at the points that matter." if lang == "en" else "Önemli noktalarda net kontrolü koruyarak pratik ilerleme için tasarlanmıştır."
    canonical = page_url(lang, page)
    de = page_url("de", page)
    en = page_url("en", page)
    tr = page_url("tr", page)
    root_link = "./" if page == "index.html" else "index.html"
    start_href = f"/registrieren.html?paket=free&lang={lang}&source=locale_{lang}"
    learn_href = "leistungen.html"
    return f'''<!doctype html>
<html lang="{lang}">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>{escape(title)}</title>
  <meta name="description" content="{escape(desc, quote=True)}" />
  <link rel="canonical" href="{canonical}" />
  <link rel="alternate" hreflang="de" href="{de}" />
  <link rel="alternate" hreflang="en" href="{en}" />
  <link rel="alternate" hreflang="tr" href="{tr}" />
  <link rel="alternate" hreflang="x-default" href="{de}" />
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="{locale}" />
  <meta property="og:locale:alternate" content="de_DE" />
  <meta property="og:locale:alternate" content="{alt_locale}" />
  <meta property="og:title" content="{escape(title, quote=True)}" />
  <meta property="og:description" content="{escape(desc, quote=True)}" />
  <meta property="og:url" content="{canonical}" />
  <meta property="og:image" content="{DOMAIN}/assets/logos/nahwerk-concierge.png" />
  <link rel="icon" type="image/svg+xml" href="/assets/logos/nahwerk-concierge-gold-transparent.svg?v=2" />
  <link rel="stylesheet" href="/assets/international.css?v=1" />
  <script src="/assets/language-switcher.js?v=1" defer></script>
</head>
<body class="nw-intl">
  <a class="skip-link" href="#main-content">{'Skip to content' if lang == 'en' else 'İçeriğe geç'}</a>
  <header class="top">
    <div class="wrap nav">
      <a class="brand" href="{root_link}" aria-label="NAHWERK Concierge">
        <span class="mark" aria-hidden="true"></span>
        <span class="brandtext"><strong>NAHWERK</strong><span>CONCIERGE</span></span>
      </a>
      <nav class="links" aria-label="{'Main navigation' if lang == 'en' else 'Ana menü'}">{nav_html(lang, page)}</nav>
    </div>
  </header>
  <main id="main-content">
    <section class="hero">
      <div class="wrap hero-grid">
        <div>
          <div class="eyebrow">{escape(eyebrow)}</div>
          <h1>{escape(h1)}</h1>
          <p class="lead">{escape(lead)}</p>
          <div class="actions">
            <a class="btn primary" href="{start_href}">{escape(n['start'])}</a>
            <a class="btn secondary" href="{learn_href}">{escape(n['learn'])}</a>
          </div>
        </div>
        <aside class="hero-card">
          <strong>{'One concierge. Clear control.' if lang == 'en' else 'Tek Concierge. Net kontrol.'}</strong>
          <p>{'NAHWERK combines AI-supported understanding with permissions and approvals around actions.' if lang == 'en' else 'NAHWERK, yapay zekâ destekli anlamayı işlemler için izin ve onaylarla birleştirir.'}</p>
        </aside>
      </div>
    </section>
    <section class="section alt">
      <div class="wrap">
        <div class="section-head">
          <div class="eyebrow">NAHWERK</div>
          <h2>{escape(section_title)}</h2>
          <p>{escape(section_lead)}</p>
        </div>
        <div class="cards">{card_html}</div>
      </div>
    </section>
  </main>
  <footer class="footer">
    <div class="wrap">
      <div class="footer-grid">
        <span>© NAHWERK Concierge</span>
        <div class="footer-links"><a href="/datenschutz.html">{'Privacy (DE)' if lang == 'en' else 'Gizlilik (DE)'}</a><a href="/impressum.html">{'Legal notice (DE)' if lang == 'en' else 'Künye (DE)'}</a><a href="/agb.html">{'Terms (DE)' if lang == 'en' else 'Şartlar (DE)'}</a></div>
      </div>
      <div class="legal-note">{escape(n['footer'])}</div>
    </div>
  </footer>
  <script src="/assets/nahwerk-analytics.js?v=1"></script>
  <script>window.addEventListener('DOMContentLoaded',()=>window.NahwerkAnalytics?.track?.('page_view',{{locale:'{lang}'}}));</script>
</body>
</html>
'''


def write_locales() -> None:
    for lang in ("en", "tr"):
        folder = ROOT / lang
        folder.mkdir(exist_ok=True)
        for page in PAGES:
            (folder / page).write_text(localized_page(lang, page), encoding="utf-8")


def update_sitemap() -> None:
    path = ROOT / "sitemap.xml"
    text = path.read_text(encoding="utf-8")
    text = re.sub(r"\s*<url>\s*<loc>https://nahwerkconcierge\.com/(?:en|tr)/(?:[^<]*)</loc>.*?</url>", "", text, flags=re.S)
    entries = []
    for lang in ("en", "tr"):
        for page in PAGES:
            entries.append(f"  <url><loc>{page_url(lang, page)}</loc></url>")
    block = "\n" + "\n".join(entries) + "\n"
    if "</urlset>" not in text:
        raise SystemExit("Invalid sitemap.xml: missing </urlset>")
    text = text.replace("</urlset>", block + "</urlset>", 1)
    path.write_text(text, encoding="utf-8")


def main() -> None:
    missing = [page for page in PAGES if page not in COPY["en"] or page not in COPY["tr"]]
    if missing:
        raise SystemExit(f"Missing locale copy: {missing}")
    for page in PAGES:
        inject_root_i18n(page)
    write_locales()
    update_sitemap()
    print(f"Generated {len(PAGES) * 2} localized pages and updated {len(PAGES)} German pages.")


if __name__ == "__main__":
    main()
