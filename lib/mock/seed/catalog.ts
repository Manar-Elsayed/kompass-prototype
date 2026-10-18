import type { Service } from "@/lib/types";

const feature = (id: string, icon: string, enT: string, arT: string, enD: string, arD: string) => ({
  id,
  icon,
  title: { en: enT, ar: arT },
  description: { en: enD, ar: arD },
});
const tip = (id: string, en: string, ar: string) => ({ id, text: { en, ar } });

const commonFeatures = (p: string) => [
  feature(`${p}-f1`, "ShieldCheck", "Verified partners only", "شركاء موثّقون فقط", "Every company is checked for commercial register, insurance and reviews before it can quote.", "يتم التحقق من السجل التجاري والتأمين والتقييمات لكل شركة قبل أن تقدّم عروضها."),
  feature(`${p}-f2`, "Scale", "Compare up to 5 quotes", "قارن حتى 5 عروض", "One request, several binding offers. You pick the best value — no obligation.", "طلب واحد وعدة عروض ملزمة. اختر الأفضل قيمةً دون أي التزام."),
  feature(`${p}-f3`, "BadgePercent", "Free for customers", "مجاني للعملاء", "Requesting offers through Kompass costs you nothing.", "طلب العروض عبر كومباس لا يكلّفك شيئاً."),
];

export const services: Service[] = [
  {
    id: "svc-private",
    slug: "private-move",
    icon: "House",
    image: "/images/hero.png",
    name: { en: "Private move", ar: "نقل منزلي" },
    short: {
      en: "Flats and houses of any size, packed, carried and set up by local pros.",
      ar: "شقق ومنازل بأي حجم، تُغلَّف وتُنقل وتُركَّب على يد محترفين محليين.",
    },
    body: {
      en: "<p>Moving home is one of life's most stressful events. Kompass connects you with vetted Swiss moving companies who handle everything from packing to furniture assembly.</p><h2>What's included</h2><ul><li>Loading, transport and unloading</li><li>Furniture disassembly and assembly</li><li>Optional packing service and boxes</li><li>Insurance for transported goods</li></ul><p>Tell us about your move once and receive up to five comparable offers within 48 hours.</p>",
      ar: "<p>يُعدّ الانتقال إلى منزل جديد من أكثر أحداث الحياة إرهاقاً. تربطك كومباس بشركات نقل سويسرية موثّقة تتولى كل شيء من التغليف حتى تركيب الأثاث.</p><h2>ما الذي تشمله الخدمة</h2><ul><li>التحميل والنقل والتفريغ</li><li>فك الأثاث وتركيبه</li><li>خدمة تغليف وصناديق اختيارية</li><li>تأمين على المنقولات</li></ul><p>أخبرنا عن نقلك مرة واحدة واحصل على ما يصل إلى خمسة عروض قابلة للمقارنة خلال 48 ساعة.</p>",
    },
    features: commonFeatures("private"),
    tips: [
      tip("private-t1", "Book 6–8 weeks ahead for month-end dates.", "احجز قبل 6 إلى 8 أسابيع لمواعيد نهاية الشهر."),
      tip("private-t2", "Reserve a parking permit in front of both addresses.", "احجز تصريح وقوف أمام العنوانين."),
      tip("private-t3", "Label boxes by room to speed up unloading.", "ضع ملصقات على الصناديق حسب الغرفة لتسريع التفريغ."),
    ],
    leadPrice: 35,
    active: true,
    order: 1,
  },
  {
    id: "svc-office",
    slug: "office-move",
    icon: "Building2",
    image: "/images/companies.png",
    name: { en: "Office move", ar: "نقل المكاتب" },
    short: {
      en: "Minimal downtime relocations for offices, practices and shops.",
      ar: "نقل المكاتب والعيادات والمتاجر بأقل وقت توقف ممكن.",
    },
    body: {
      en: "<p>Business relocations need planning down to the hour. Our partners move IT, archives and furniture over a weekend so you're back to work on Monday.</p><h2>Typical scope</h2><ul><li>Project plan and site visit</li><li>IT and server transport</li><li>Archive and document handling</li><li>Disposal of old furniture</li></ul>",
      ar: "<p>يحتاج نقل الأعمال إلى تخطيط دقيق حتى الساعة. ينقل شركاؤنا الأجهزة والأرشيف والأثاث خلال عطلة نهاية الأسبوع لتعود إلى العمل يوم الاثنين.</p><h2>النطاق المعتاد</h2><ul><li>خطة مشروع وزيارة ميدانية</li><li>نقل أجهزة تقنية المعلومات والخوادم</li><li>التعامل مع الأرشيف والمستندات</li><li>التخلص من الأثاث القديم</li></ul>",
    },
    features: commonFeatures("office"),
    tips: [
      tip("office-t1", "Nominate one internal move coordinator.", "عيّن منسقاً داخلياً واحداً للنقل."),
      tip("office-t2", "Back up all servers before transport.", "احتفظ بنسخة احتياطية من جميع الخوادم قبل النقل."),
    ],
    leadPrice: 55,
    active: true,
    order: 2,
  },
  {
    id: "svc-cleaning",
    slug: "moving-cleaning",
    icon: "Sparkles",
    image: "/images/about-target.png",
    name: { en: "End-of-tenancy cleaning", ar: "تنظيف نهاية الإيجار" },
    short: {
      en: "Handover cleaning with acceptance guarantee for your landlord.",
      ar: "تنظيف التسليم مع ضمان قبول المالك.",
    },
    body: {
      en: "<p>In Switzerland the flat handover is strict. Our cleaning partners offer an <strong>acceptance guarantee</strong>: if the landlord finds anything, they come back free of charge.</p>",
      ar: "<p>في سويسرا يكون تسليم الشقة صارماً. يقدّم شركاؤنا في التنظيف <strong>ضمان القبول</strong>: إذا وجد المالك أي ملاحظة يعودون مجاناً.</p>",
    },
    features: commonFeatures("cleaning"),
    tips: [tip("cleaning-t1", "Schedule cleaning 1–2 days before the handover.", "حدّد موعد التنظيف قبل التسليم بيوم أو يومين.")],
    leadPrice: 25,
    active: true,
    order: 3,
  },
  {
    id: "svc-clearance",
    slug: "clearance-disposal",
    icon: "Trash2",
    image: "/images/start-now.png",
    name: { en: "Clearance & disposal", ar: "الإخلاء والتخلص" },
    short: {
      en: "Cellars, attics and whole households cleared and recycled responsibly.",
      ar: "إخلاء الأقبية والعلّيات والمنازل بالكامل مع إعادة التدوير بمسؤولية.",
    },
    body: {
      en: "<p>From a single sofa to a full estate clearance — partners sort, recycle and dispose according to cantonal rules.</p>",
      ar: "<p>من أريكة واحدة إلى إخلاء كامل للممتلكات — يقوم الشركاء بالفرز وإعادة التدوير والتخلص وفق أنظمة الكانتون.</p>",
    },
    features: commonFeatures("clearance"),
    tips: [tip("clearance-t1", "Separate items to donate before the team arrives.", "افصل الأغراض المخصصة للتبرع قبل وصول الفريق.")],
    leadPrice: 20,
    active: true,
    order: 4,
  },
  {
    id: "svc-piano",
    slug: "piano-transport",
    icon: "Piano",
    image: "/images/blog.png",
    name: { en: "Piano transport", ar: "نقل البيانو" },
    short: {
      en: "Specialist crews and equipment for upright and grand pianos.",
      ar: "فرق ومعدات متخصصة للبيانو العمودي والكبير.",
    },
    body: {
      en: "<p>Pianos need special trolleys, straps and experience. Only partners certified for heavy instrument transport receive these requests.</p>",
      ar: "<p>يحتاج البيانو إلى عربات وأحزمة خاصة وخبرة. لا تصل هذه الطلبات إلا إلى الشركاء المعتمدين لنقل الآلات الثقيلة.</p>",
    },
    features: commonFeatures("piano"),
    tips: [tip("piano-t1", "Let the piano acclimatise 2 weeks before tuning.", "اترك البيانو يتأقلم أسبوعين قبل ضبطه.")],
    leadPrice: 30,
    active: true,
    order: 5,
  },
  {
    id: "svc-storage",
    slug: "storage",
    icon: "Warehouse",
    image: "/images/companies.png",
    name: { en: "Storage", ar: "التخزين" },
    short: {
      en: "Secure short- or long-term storage between two addresses.",
      ar: "تخزين آمن قصير أو طويل الأمد بين عنوانين.",
    },
    body: {
      en: "<p>Climate-controlled, insured storage boxes from 1 m³ — collected and delivered by the moving partner.</p>",
      ar: "<p>صناديق تخزين مؤمّنة ومكيّفة بدءاً من متر مكعب واحد — يجمعها شريك النقل ويوصلها.</p>",
    },
    features: commonFeatures("storage"),
    tips: [tip("storage-t1", "Make an inventory list with photos.", "أعدّ قائمة جرد مع صور.")],
    leadPrice: 18,
    active: true,
    order: 6,
  },
  {
    id: "svc-international",
    slug: "international-move",
    icon: "Globe2",
    image: "/images/hero.png",
    name: { en: "International move", ar: "النقل الدولي" },
    short: {
      en: "Moves to and from Switzerland including customs paperwork.",
      ar: "النقل من سويسرا وإليها بما في ذلك الإجراءات الجمركية.",
    },
    body: {
      en: "<p>Partners handle customs declarations, removal goods lists and EU transit so you can focus on settling in.</p>",
      ar: "<p>يتولى الشركاء التصاريح الجمركية وقوائم الأمتعة والعبور عبر الاتحاد الأوروبي لتتفرغ للاستقرار.</p>",
    },
    features: commonFeatures("intl"),
    tips: [tip("intl-t1", "Register your departure with the commune 2 weeks ahead.", "سجّل مغادرتك لدى البلدية قبل أسبوعين.")],
    leadPrice: 70,
    active: true,
    order: 7,
  },
  {
    id: "svc-painting",
    slug: "painting",
    icon: "PaintRoller",
    image: "/images/about-hero.png",
    name: { en: "Painting", ar: "الدهان" },
    short: {
      en: "Fresh walls before you move in or touch-ups for the handover.",
      ar: "جدران جديدة قبل الانتقال أو لمسات إصلاح قبل التسليم.",
    },
    body: {
      en: "<p>Professional painters for single rooms or whole flats, including filling holes and protecting floors.</p>",
      ar: "<p>دهّانون محترفون لغرفة واحدة أو شقة كاملة، بما في ذلك سدّ الثقوب وحماية الأرضيات.</p>",
    },
    features: commonFeatures("painting"),
    tips: [tip("painting-t1", "Ask your landlord which colours are allowed.", "اسأل المالك عن الألوان المسموح بها.")],
    leadPrice: 22,
    active: false,
    order: 8,
  },
];
