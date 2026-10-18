import type { AdminUser, Blog, Config, Faq, ModelOffer, Role, SiteContent } from "@/lib/types";
import { daysAgo } from "./rng";

const l = (en: string, ar: string) => ({ en, ar });

export const site: SiteContent = {
  general: {
    phone: "+41 44 555 12 34",
    email: "hello@kompassumzug.ch",
    address: l("Bahnhofstrasse 21, 8001 Zürich, Switzerland", "بانهوفشتراسه 21، 8001 زيورخ، سويسرا"),
    hours: l("Mon–Fri 08:00–18:00", "الاثنين – الجمعة 08:00 – 18:00"),
    socials: {
      facebook: "https://facebook.com",
      instagram: "https://instagram.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    footerAbout: l(
      "Kompass is Switzerland's comparison platform for moving, cleaning and clearance services. One request — up to five offers from verified local companies.",
      "كومباس هي منصة المقارنة السويسرية لخدمات النقل والتنظيف والإخلاء. طلب واحد — وما يصل إلى خمسة عروض من شركات محلية موثّقة.",
    ),
  },
  home: {
    heroEyebrow: l("Switzerland's moving marketplace", "سوق النقل الأول في سويسرا"),
    heroTitle: l("Compare moving offers. Save up to 40%.", "قارن عروض النقل ووفّر حتى 40%"),
    heroDescription: l(
      "Describe your move once and receive up to five binding quotes from verified Swiss moving companies — free and without obligation.",
      "صف نقلك مرة واحدة واحصل على ما يصل إلى خمسة عروض ملزمة من شركات نقل سويسرية موثّقة — مجاناً ودون أي التزام.",
    ),
    heroCta: l("Get free offers", "احصل على عروض مجانية"),
    heroImage: "/images/hero.png",
    stats: [
      { value: "12,400+", label: l("moves arranged", "عملية نقل منجزة") },
      { value: "180+", label: l("verified partners", "شريك موثّق") },
      { value: "4.8/5", label: l("customer rating", "تقييم العملاء") },
    ],
    servicesTitle: l("Everything for your move", "كل ما تحتاجه لنقلك"),
    servicesSubtitle: l("Choose a service and get tailored offers in 48 hours.", "اختر خدمة واحصل على عروض مخصّصة خلال 48 ساعة."),
    howTitle: l("How Kompass works", "كيف تعمل كومباس"),
    howSubtitle: l("Three steps from request to moving day.", "ثلاث خطوات من الطلب حتى يوم النقل."),
    steps: [
      { icon: "ClipboardList", title: l("Describe your move", "صف نقلك"), description: l("Fill in the 2-minute form with addresses, rooms and date.", "املأ النموذج خلال دقيقتين بالعناوين وعدد الغرف والتاريخ.") },
      { icon: "Inbox", title: l("Receive offers", "استلم العروض"), description: l("Up to five verified companies contact you with binding quotes.", "تتواصل معك حتى خمس شركات موثّقة بعروض ملزمة.") },
      { icon: "BadgeCheck", title: l("Choose & save", "اختر ووفّر"), description: l("Compare prices and reviews, then book the best fit.", "قارن الأسعار والتقييمات ثم احجز الأنسب.") },
    ],
    testimonialsTitle: l("What customers say", "ماذا يقول العملاء"),
    testimonialsSubtitle: l("Real reviews from people who moved with Kompass.", "تقييمات حقيقية من أشخاص انتقلوا مع كومباس."),
    faqTitle: l("Frequently asked questions", "الأسئلة الشائعة"),
    faqSubtitle: l("Everything you need to know before requesting offers.", "كل ما تحتاج معرفته قبل طلب العروض."),
    trustedTitle: l("Trusted by leading Swiss movers", "موثوق به من كبرى شركات النقل السويسرية"),
    partnerCtaTitle: l("Are you a moving company?", "هل أنت شركة نقل؟"),
    partnerCtaDescription: l(
      "Join 180+ partners who receive qualified leads in their region every day.",
      "انضم إلى أكثر من 180 شريكاً يتلقّون طلبات مؤهلة في منطقتهم يومياً.",
    ),
    partnerCtaButton: l("Become a partner", "كن شريكاً"),
  },
  offerForm: {
    title: l("Request your free offers", "اطلب عروضك المجانية"),
    subtitle: l("Takes about 2 minutes. No obligation.", "يستغرق حوالي دقيقتين. دون أي التزام."),
    step1: l("Your move", "تفاصيل النقل"),
    step2: l("Contact details", "بيانات التواصل"),
    successTitle: l("Request received!", "تم استلام طلبك!"),
    successMessage: l(
      "Verified partners will contact you within 48 hours with their offers. Check your inbox for a confirmation.",
      "سيتواصل معك شركاء موثّقون خلال 48 ساعة بعروضهم. تحقّق من بريدك للحصول على التأكيد.",
    ),
    note: l("Your data is only shared with the companies you receive offers from.", "لا تتم مشاركة بياناتك إلا مع الشركات التي تتلقى منها العروض."),
  },
  about: {
    title: l("We make moving simple", "نجعل النقل بسيطاً"),
    subtitle: l("About Kompass", "عن كومباس"),
    body: l(
      "Kompass was founded in Zürich to bring transparency to a fragmented market. We verify every partner, collect honest reviews and make comparing offers effortless.",
      "تأسست كومباس في زيورخ لتجلب الشفافية إلى سوق مجزّأ. نتحقق من كل شريك ونجمع تقييمات صادقة ونجعل مقارنة العروض سهلة.",
    ),
    image: "/images/about-hero.png",
    mission: l("Help every household in Switzerland find a fair, reliable moving partner.", "مساعدة كل أسرة في سويسرا على إيجاد شريك نقل عادل وموثوق."),
    vision: l("The most trusted marketplace for home services in the DACH region.", "أن نكون السوق الأكثر ثقة لخدمات المنازل في منطقة دول الداخ."),
    values: [
      { icon: "ShieldCheck", title: l("Trust", "الثقة"), description: l("Verified companies and moderated reviews.", "شركات موثّقة وتقييمات خاضعة للإشراف.") },
      { icon: "Eye", title: l("Transparency", "الشفافية"), description: l("Clear prices, no hidden fees.", "أسعار واضحة بلا رسوم خفية.") },
      { icon: "HeartHandshake", title: l("Fairness", "العدالة"), description: l("Fair lead prices for partners, free for customers.", "أسعار عادلة للشركاء ومجانية للعملاء.") },
    ],
    numbers: [
      { value: "2019", label: l("founded", "سنة التأسيس") },
      { value: "26", label: l("cantons covered", "كانتوناً مغطى") },
      { value: "12k+", label: l("happy moves", "عملية نقل سعيدة") },
      { value: "48h", label: l("average response", "متوسط وقت الرد") },
    ],
  },
  contact: {
    title: l("Get in touch", "تواصل معنا"),
    subtitle: l("Our team answers within one business day.", "يرد فريقنا خلال يوم عمل واحد."),
    formTitle: l("Send us a message", "أرسل لنا رسالة"),
    image: "/images/contact.png",
  },
  companiesPage: {
    title: l("Verified moving companies", "شركات نقل موثّقة"),
    subtitle: l("Browse partners by service, region and rating.", "تصفّح الشركاء حسب الخدمة والمنطقة والتقييم."),
    image: "/images/companies.png",
  },
  blogsPage: {
    title: l("Moving guides & tips", "أدلة ونصائح النقل"),
    subtitle: l("Checklists, cost guides and expert advice.", "قوائم مراجعة وأدلة تكاليف ونصائح الخبراء."),
    image: "/images/blogs-hero.png",
  },
  faqPage: {
    title: l("Help centre", "مركز المساعدة"),
    subtitle: l("Answers to the most common questions.", "إجابات على الأسئلة الأكثر شيوعاً."),
    askTitle: l("Didn't find your answer?", "لم تجد إجابتك؟"),
  },
  partnerPage: {
    title: l("Grow your moving business with Kompass", "نمِّ أعمال النقل لديك مع كومباس"),
    subtitle: l("Qualified leads in your region. Pay only for what you buy.", "طلبات مؤهلة في منطقتك. ادفع فقط مقابل ما تشتريه."),
    benefits: [
      { icon: "Target", title: l("Qualified leads", "طلبات مؤهلة"), description: l("Detailed requests with rooms, floors and dates.", "طلبات مفصلة بعدد الغرف والطوابق والتواريخ.") },
      { icon: "Wallet", title: l("No subscription", "بلا اشتراك"), description: l("Buy leads individually from the shop.", "اشترِ الطلبات بشكل فردي من المتجر.") },
      { icon: "Star", title: l("Build reputation", "ابنِ سمعتك"), description: l("Collect verified reviews on your profile.", "اجمع تقييمات موثّقة على ملفك.") },
      { icon: "LifeBuoy", title: l("Fair-lead guarantee", "ضمان الطلب العادل"), description: l("Report fake leads and get credited.", "أبلغ عن الطلبات الوهمية واسترد قيمتها.") },
    ],
    steps: [
      { icon: "FileText", title: l("Apply online", "قدّم طلبك"), description: l("Company, contact and bank details in 5 minutes.", "بيانات الشركة والتواصل والبنك في 5 دقائق.") },
      { icon: "FileSignature", title: l("Sign the contract", "وقّع العقد"), description: l("We verify your documents and send the contract.", "نتحقق من مستنداتك ونرسل العقد.") },
      { icon: "Rocket", title: l("Start receiving leads", "ابدأ باستلام الطلبات"), description: l("Buy leads that match your services and region.", "اشترِ الطلبات المناسبة لخدماتك ومنطقتك.") },
    ],
    ctaTitle: l("Ready to grow?", "مستعد للنمو؟"),
    ctaDescription: l("Applications are reviewed within 2 business days.", "تتم مراجعة الطلبات خلال يومي عمل."),
  },
  legal: {
    imprint: l(
      "<h2>Imprint</h2><p><strong>Kompass Umzug GmbH</strong><br/>Bahnhofstrasse 21<br/>8001 Zürich, Switzerland</p><p>Commercial register: CHE-123.456.789<br/>Managing director: Laura Meier</p><p>Email: hello@kompassumzug.ch</p>",
      "<h2>بيانات الناشر</h2><p><strong>كومباس أومتسوغ ش.ذ.م.م</strong><br/>بانهوفشتراسه 21<br/>8001 زيورخ، سويسرا</p><p>السجل التجاري: CHE-123.456.789<br/>المديرة العامة: لاورا ماير</p><p>البريد: hello@kompassumzug.ch</p>",
    ),
    privacy: l(
      "<h2>Privacy policy</h2><p>We process personal data only to deliver offers you request. Data is shared with a maximum of five partner companies.</p><h3>Your rights</h3><ul><li>Access and correction</li><li>Deletion</li><li>Objection to processing</li></ul>",
      "<h2>سياسة الخصوصية</h2><p>نعالج البيانات الشخصية فقط لتقديم العروض التي تطلبها. تتم مشاركة البيانات مع خمس شركات شريكة كحد أقصى.</p><h3>حقوقك</h3><ul><li>الاطلاع والتصحيح</li><li>الحذف</li><li>الاعتراض على المعالجة</li></ul>",
    ),
    terms: l(
      "<h2>Terms & conditions</h2><p>Kompass acts as an intermediary. Contracts for services are concluded directly between the customer and the partner company.</p><h3>Partners</h3><p>Lead prices are listed in the partner shop. Reported fake leads are reviewed within 5 business days.</p>",
      "<h2>الشروط والأحكام</h2><p>تعمل كومباس كوسيط. تُبرم عقود الخدمات مباشرة بين العميل والشركة الشريكة.</p><h3>الشركاء</h3><p>أسعار الطلبات معروضة في متجر الشركاء. تتم مراجعة الطلبات الوهمية المبلّغ عنها خلال 5 أيام عمل.</p>",
    ),
  },
  popup: {
    enabled: true,
    title: l("Autumn offer: 10% off cleaning", "عرض الخريف: خصم 10% على التنظيف"),
    body: l("Book a move and end-of-tenancy cleaning together and save.", "احجز النقل وتنظيف نهاية الإيجار معاً ووفّر."),
    cta: l("Request offers", "اطلب العروض"),
    href: "/#offer-form",
    delaySec: 8,
  },
};

export const faqs: Faq[] = [
  { id: "faq-1", order: 1, question: l("Is Kompass really free?", "هل كومباس مجانية فعلاً؟"), answer: l("Yes. Customers never pay Kompass. Partners pay a small fee per lead.", "نعم. لا يدفع العملاء شيئاً لكومباس. يدفع الشركاء رسوماً صغيرة لكل طلب.") },
  { id: "faq-2", order: 2, question: l("How many offers will I receive?", "كم عدد العروض التي سأتلقاها؟"), answer: l("You choose between 1 and 5 offers when you submit the form.", "تختار بين عرض واحد وخمسة عروض عند إرسال النموذج.") },
  { id: "faq-3", order: 3, question: l("How are partner companies verified?", "كيف يتم التحقق من الشركات الشريكة؟"), answer: l("We check the commercial register extract, liability insurance and signed contract before activation.", "نتحقق من مستخرج السجل التجاري وتأمين المسؤولية والعقد الموقّع قبل التفعيل.") },
  { id: "faq-4", order: 4, question: l("Am I obliged to accept an offer?", "هل أنا ملزم بقبول عرض؟"), answer: l("No. Offers are free and without obligation.", "لا. العروض مجانية ودون أي التزام.") },
  { id: "faq-5", order: 5, question: l("Can I complain about a company?", "هل يمكنني تقديم شكوى ضد شركة؟"), answer: l("Yes — use the complaint button on any company profile. Our team reviews every case.", "نعم — استخدم زر الشكوى في أي ملف شركة. يراجع فريقنا كل حالة.") },
  { id: "faq-6", order: 6, question: l("When should I request offers?", "متى يجب أن أطلب العروض؟"), answer: l("Ideally 4–8 weeks before your moving date.", "يُفضّل قبل 4 إلى 8 أسابيع من موعد النقل.") },
];

const blogBody = (en: string, ar: string) =>
  l(
    `<p>${en}</p><h2>Plan early</h2><p>Start with an inventory of every room. It helps companies quote accurately and avoids surprises on moving day.</p><h2>Compare more than price</h2><ul><li>Insurance coverage</li><li>Included packing material</li><li>Reviews from recent customers</li></ul><blockquote>Tip: request offers for the move and the cleaning together — many partners give a combined discount.</blockquote>`,
    `<p>${ar}</p><h2>خطّط مبكراً</h2><p>ابدأ بجرد كل غرفة. يساعد ذلك الشركات على تقديم أسعار دقيقة ويجنّبك المفاجآت يوم النقل.</p><h2>قارن أكثر من السعر</h2><ul><li>تغطية التأمين</li><li>مواد التغليف المشمولة</li><li>تقييمات العملاء الأخيرة</li></ul><blockquote>نصيحة: اطلب عروض النقل والتنظيف معاً — يقدّم كثير من الشركاء خصماً مجمّعاً.</blockquote>`,
  );

export const blogs: Blog[] = [
  { id: "blog-1", slug: "moving-checklist-switzerland", serviceId: "svc-private", image: "/images/blog.png", readMins: 6, published: true, createdAt: daysAgo(4), title: l("The ultimate moving checklist for Switzerland", "قائمة النقل الشاملة في سويسرا"), excerpt: l("Eight weeks to moving day: what to do, when.", "ثمانية أسابيع حتى يوم النقل: ماذا تفعل ومتى."), body: blogBody("Moving in Switzerland comes with its own rules — from commune registration to strict flat handovers.", "للنقل في سويسرا قواعده الخاصة — من التسجيل في البلدية إلى تسليم الشقق الصارم.") },
  { id: "blog-2", slug: "how-much-does-a-move-cost", serviceId: "svc-private", image: "/images/hero.png", readMins: 5, published: true, createdAt: daysAgo(11), title: l("How much does a move cost in 2026?", "كم تكلّف عملية النقل في 2026؟"), excerpt: l("Average prices by flat size and canton.", "متوسط الأسعار حسب حجم الشقة والكانتون."), body: blogBody("Prices vary widely by canton, floor and access. Here are realistic ranges.", "تختلف الأسعار كثيراً حسب الكانتون والطابق وسهولة الوصول. إليك نطاقات واقعية.") },
  { id: "blog-3", slug: "handover-cleaning-guide", serviceId: "svc-cleaning", image: "/images/about-target.png", readMins: 4, published: true, createdAt: daysAgo(18), title: l("Passing the flat handover first time", "اجتياز تسليم الشقة من المرة الأولى"), excerpt: l("What landlords check and how a guarantee protects you.", "ما الذي يتحقق منه المالك وكيف يحميك الضمان."), body: blogBody("The handover protocol decides whether you get your deposit back.", "يحدد محضر التسليم ما إذا كنت ستسترد وديعتك.") },
  { id: "blog-4", slug: "office-move-weekend", serviceId: "svc-office", image: "/images/companies.png", readMins: 7, published: true, createdAt: daysAgo(25), title: l("Moving an office over one weekend", "نقل مكتب خلال عطلة نهاية أسبوع واحدة"), excerpt: l("A project plan template for zero downtime.", "قالب خطة مشروع لنقل دون توقف."), body: blogBody("With the right plan your team logs off on Friday and back in on Monday.", "مع الخطة الصحيحة يغادر فريقك يوم الجمعة ويعود يوم الاثنين.") },
  { id: "blog-5", slug: "decluttering-before-moving", serviceId: "svc-clearance", image: "/images/start-now.png", readMins: 3, published: true, createdAt: daysAgo(33), title: l("Declutter first, move less", "تخلّص من الفوضى أولاً وانقل أقل"), excerpt: l("Fewer boxes means a cheaper move.", "صناديق أقل تعني نقلاً أرخص."), body: blogBody("Every cubic metre you don't move saves money.", "كل متر مكعب لا تنقله يوفّر المال.") },
  { id: "blog-6", slug: "moving-abroad-customs", serviceId: "svc-international", image: "/images/blogs-hero.png", readMins: 8, published: false, createdAt: daysAgo(2), title: l("Leaving Switzerland: customs made easy", "مغادرة سويسرا: الجمارك بسهولة"), excerpt: l("Removal goods, forms and timelines explained.", "شرح الأمتعة والنماذج والجداول الزمنية."), body: blogBody("International moves require a removal goods declaration.", "يتطلب النقل الدولي تصريحاً بالأمتعة المنزلية.") },
];

export const modelOffers: ModelOffer[] = [
  { id: "mo-1", serviceId: "svc-private", title: l("3.5-room flat", "شقة من 3.5 غرف"), route: l("Zürich → Winterthur", "زيورخ ← فينترتور"), rooms: "3.5", price: 1450, active: true },
  { id: "mo-2", serviceId: "svc-cleaning", title: l("Handover cleaning 4.5 rooms", "تنظيف تسليم 4.5 غرف"), route: l("Bern", "برن"), rooms: "4.5", price: 980, active: true },
  { id: "mo-3", serviceId: "svc-office", title: l("Office, 12 workstations", "مكتب بـ 12 محطة عمل"), route: l("Basel → Liestal", "بازل ← ليستال"), rooms: "-", price: 6200, active: true },
];

export const config: Config = {
  defaultLeadPrice: 35,
  maxOffersPerLead: 5,
  vatRate: 8.1,
  leadExpiryDays: 14,
  autoDistribute: true,
  comingSoonMode: false,
  supportEmail: "partners@kompassumzug.ch",
  invoicePrefix: "KMP",
  contractTemplate: "partner-contract-v3.pdf",
};

export const roles: Role[] = [
  {
    id: "role-super",
    system: true,
    name: l("Super admin", "مشرف عام"),
    description: l("Full access to every module.", "وصول كامل إلى جميع الوحدات."),
    permissions: ["dashboard", "leads", "partners", "finance", "moderation", "inbox", "insights", "cms", "settings"],
  },
  {
    id: "role-editor",
    name: l("Content editor", "محرر المحتوى"),
    description: l("Website content, reviews and inbox.", "محتوى الموقع والتقييمات والبريد."),
    permissions: ["dashboard", "cms", "moderation", "inbox"],
  },
  {
    id: "role-finance",
    name: l("Finance", "المالية"),
    description: l("Dues, coupons, shop and partner wallets.", "المستحقات والقسائم والمتجر ومحافظ الشركاء."),
    permissions: ["dashboard", "finance", "leads", "partners"],
  },
  {
    id: "role-support",
    name: l("Support agent", "وكيل دعم"),
    description: l("Leads, complaints and customer messages.", "الطلبات والشكاوى ورسائل العملاء."),
    permissions: ["dashboard", "leads", "moderation", "inbox", "insights"],
  },
];

export const users: AdminUser[] = [
  { id: "u-1", name: "Laura Meier", email: "laura@kompassumzug.ch", phone: "+41 79 111 22 33", roleId: "role-super", active: true, lastLogin: daysAgo(0, -1) },
  { id: "u-2", name: "Omar Haddad", email: "omar@kompassumzug.ch", phone: "+41 78 222 33 44", roleId: "role-editor", active: true, lastLogin: daysAgo(1) },
  { id: "u-3", name: "Sandra Keller", email: "sandra@kompassumzug.ch", phone: "+41 76 333 44 55", roleId: "role-finance", active: true, lastLogin: daysAgo(2) },
  { id: "u-4", name: "Nadia Rossi", email: "nadia@kompassumzug.ch", phone: "+41 77 444 55 66", roleId: "role-support", active: false, lastLogin: daysAgo(40) },
];
