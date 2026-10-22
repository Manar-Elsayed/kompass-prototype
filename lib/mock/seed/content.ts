import type { AdminUser, Blog, Config, Faq, L10n, ModelOffer, Role, SiteContent } from "@/lib/types";
import { daysAgo } from "./rng";

/** Build a five-language string: en, ar, de, fr, it. */
const l = (en: string, de: string, fr: string, it: string): L10n => ({ en, de, fr, it });

export const site: SiteContent = {
  general: {
    phone: "+41 44 555 12 34",
    email: "hello@kompassumzug.ch",
    address: l(
      "Bahnhofstrasse 21, 8001 Zürich, Switzerland",
      "Bahnhofstrasse 21, 8001 Zürich, Schweiz",
      "Bahnhofstrasse 21, 8001 Zürich, Suisse",
      "Bahnhofstrasse 21, 8001 Zürich, Svizzera",
    ),
    hours: l("Mon–Fri 08:00–18:00", "Mo–Fr 08:00–18:00", "Lun–ven 08:00–18:00", "Lun–ven 08:00–18:00"),
    socials: {
      facebook: "https://facebook.com",
      instagram: "https://instagram.com",
      linkedin: "https://linkedin.com",
      youtube: "https://youtube.com",
    },
    footerAbout: l(
      "Kompass is Switzerland's comparison platform for moving, cleaning and clearance services. One request — up to five offers from verified local companies.",
      "Kompass ist die Schweizer Vergleichsplattform für Umzugs-, Reinigungs- und Räumungsdienstleistungen. Eine Anfrage – bis zu fünf Offerten von geprüften lokalen Unternehmen.",
      "Kompass est la plateforme suisse de comparaison pour les déménagements, le nettoyage et le débarras. Une seule demande, jusqu'à cinq offres d'entreprises locales vérifiées.",
      "Kompass è la piattaforma svizzera di confronto per traslochi, pulizie e sgomberi. Una sola richiesta, fino a cinque offerte da aziende locali verificate.",
    ),
  },
  home: {
    heroEyebrow: l("Switzerland's moving marketplace", "Der Umzugsmarktplatz der Schweiz", "La place de marché suisse du déménagement", "Il marketplace svizzero dei traslochi"),
    heroTitle: l(
      "Compare moving offers. Save up to 40%.",
      "Umzugsofferten vergleichen. Bis zu 40 % sparen.",
      "Comparez les offres de déménagement. Économisez jusqu'à 40 %.",
      "Confronti le offerte di trasloco. Risparmi fino al 40%.",
    ),
    heroDescription: l(
      "Describe your move once and receive up to five binding quotes from verified Swiss moving companies — free and without obligation.",
      "Beschreiben Sie Ihren Umzug einmal und erhalten Sie bis zu fünf verbindliche Offerten von geprüften Schweizer Umzugsfirmen – kostenlos und unverbindlich.",
      "Décrivez votre déménagement une seule fois et recevez jusqu'à cinq offres fermes d'entreprises de déménagement suisses vérifiées, gratuitement et sans engagement.",
      "Descriva il Suo trasloco una sola volta e riceva fino a cinque offerte vincolanti da ditte di traslochi svizzere verificate, gratuitamente e senza impegno.",
    ),
    heroCta: l("Get free offers", "Kostenlose Offerten erhalten", "Recevoir des offres gratuites", "Ricevere offerte gratuite"),
    heroImage: "/images/hero.png",
    stats: [
      { value: "12,400+", label: l("moves arranged", "vermittelte Umzüge", "déménagements organisés", "traslochi organizzati") },
      { value: "180+", label: l("verified partners", "geprüfte Partner", "partenaires vérifiés", "partner verificati") },
      { value: "4.8/5", label: l("customer rating", "Kundenbewertung", "note des clients", "valutazione dei clienti") },
    ],
    servicesTitle: l("Everything for your move", "Alles für Ihren Umzug", "Tout pour votre déménagement", "Tutto per il Suo trasloco"),
    servicesSubtitle: l(
      "Choose a service and get tailored offers in 48 hours.",
      "Wählen Sie eine Dienstleistung und erhalten Sie innert 48 Stunden passende Offerten.",
      "Choisissez un service et recevez des offres sur mesure en 48 heures.",
      "Scelga un servizio e riceva offerte su misura entro 48 ore.",
    ),
    howTitle: l("How Kompass works", "So funktioniert Kompass", "Comment fonctionne Kompass", "Come funziona Kompass"),
    howSubtitle: l(
      "Three steps from request to moving day.",
      "In drei Schritten von der Anfrage zum Umzugstag.",
      "Trois étapes de la demande au jour du déménagement.",
      "Tre passi dalla richiesta al giorno del trasloco.",
    ),
    steps: [
      {
        icon: "ClipboardList",
        title: l("Describe your move", "Umzug beschreiben", "Décrivez votre déménagement", "Descriva il Suo trasloco"),
        description: l(
          "Fill in the 2-minute form with addresses, rooms and date.",
          "Füllen Sie das 2-Minuten-Formular mit Adressen, Zimmern und Datum aus.",
          "Remplissez le formulaire de 2 minutes avec les adresses, les pièces et la date.",
          "Compili il modulo in 2 minuti con indirizzi, locali e data.",
        ),
      },
      {
        icon: "Inbox",
        title: l("Receive offers", "Offerten erhalten", "Recevez des offres", "Riceva le offerte"),
        description: l(
          "Up to five verified companies contact you with binding quotes.",
          "Bis zu fünf geprüfte Unternehmen melden sich mit verbindlichen Offerten bei Ihnen.",
          "Jusqu'à cinq entreprises vérifiées vous contactent avec des offres fermes.",
          "Fino a cinque aziende verificate La contattano con offerte vincolanti.",
        ),
      },
      {
        icon: "BadgeCheck",
        title: l("Choose & save", "Auswählen & sparen", "Choisissez & économisez", "Scelga & risparmi"),
        description: l(
          "Compare prices and reviews, then book the best fit.",
          "Vergleichen Sie Preise und Bewertungen und buchen Sie das passendste Angebot.",
          "Comparez les prix et les avis, puis réservez l'offre qui vous convient le mieux.",
          "Confronti prezzi e recensioni, poi prenoti l'offerta più adatta.",
        ),
      },
    ],
    testimonialsTitle: l("What customers say", "Das sagen unsere Kunden", "Ce que disent nos clients", "Cosa dicono i clienti"),
    testimonialsSubtitle: l(
      "Real reviews from people who moved with Kompass.",
      "Echte Bewertungen von Menschen, die mit Kompass umgezogen sind.",
      "De vrais avis de personnes qui ont déménagé avec Kompass.",
      "Recensioni autentiche di persone che hanno traslocato con Kompass.",
    ),
    faqTitle: l("Frequently asked questions", "Häufig gestellte Fragen", "Questions fréquentes", "Domande frequenti"),
    faqSubtitle: l(
      "Everything you need to know before requesting offers.",
      "Alles, was Sie wissen müssen, bevor Sie Offerten anfragen.",
      "Tout ce qu'il faut savoir avant de demander des offres.",
      "Tutto ciò che deve sapere prima di richiedere offerte.",
    ),
    trustedTitle: l(
      "Trusted by leading Swiss movers",
      "Führende Schweizer Umzugsfirmen vertrauen uns",
      "La confiance des principaux déménageurs suisses",
      "Scelto dalle principali ditte di traslochi svizzere",
    ),
    partnerCtaTitle: l("Are you a moving company?", "Sind Sie ein Umzugsunternehmen?", "Vous êtes une entreprise de déménagement ?", "È una ditta di traslochi?"),
    partnerCtaDescription: l(
      "Join 180+ partners who receive qualified offers in their region every day.",
      "Schliessen Sie sich über 180 Partnern an, die täglich qualifizierte Anfragen in ihrer Region erhalten.",
      "Rejoignez plus de 180 partenaires qui reçoivent chaque jour des demandes qualifiées dans leur région.",
      "Si unisca agli oltre 180 partner che ricevono ogni giorno richieste qualificate nella loro regione.",
    ),
    partnerCtaButton: l("Become a partner", "Partner werden", "Devenir partenaire", "Diventare partner"),
  },
  offerForm: {
    title: l("Request your free offers", "Kostenlose Offerten anfordern", "Demandez vos offres gratuites", "Richieda le Sue offerte gratuite"),
    subtitle: l(
      "Takes about 2 minutes. No obligation.",
      "Dauert etwa 2 Minuten. Unverbindlich.",
      "Environ 2 minutes. Sans engagement.",
      "Richiede circa 2 minuti. Senza impegno.",
    ),
    step1: l("Your move", "Ihr Umzug", "Votre déménagement", "Il Suo trasloco"),
    step2: l("Contact details", "Kontaktangaben", "Coordonnées", "Dati di contatto"),
    successTitle: l("Request received!", "Anfrage erhalten!", "Demande reçue !", "Richiesta ricevuta!"),
    successMessage: l(
      "Verified partners will contact you within 48 hours with their offers. Check your inbox for a confirmation.",
      "Geprüfte Partner melden sich innert 48 Stunden mit ihren Offerten bei Ihnen. Eine Bestätigung finden Sie in Ihrem Posteingang.",
      "Des partenaires vérifiés vous contacteront dans les 48 heures avec leurs offres. Consultez votre boîte de réception pour la confirmation.",
      "Partner verificati La contatteranno entro 48 ore con le loro offerte. Controlli la Sua casella di posta per la conferma.",
    ),
    note: l(
      "Your data is only shared with the companies you receive offers from.",
      "Ihre Daten werden nur an die Unternehmen weitergegeben, von denen Sie Offerten erhalten.",
      "Vos données sont uniquement transmises aux entreprises dont vous recevez des offres.",
      "I Suoi dati vengono condivisi solo con le aziende da cui riceve offerte.",
    ),
  },
  about: {
    title: l("We make moving simple", "Wir machen Umziehen einfach", "Nous simplifions le déménagement", "Rendiamo semplice il trasloco"),
    subtitle: l("About Kompass", "Über Kompass", "À propos de Kompass", "Chi è Kompass"),
    body: l(
      "Kompass was founded in Zürich to bring transparency to a fragmented market. We verify every partner, collect honest reviews and make comparing offers effortless.",
      "Kompass wurde in Zürich gegründet, um Transparenz in einen fragmentierten Markt zu bringen. Wir prüfen jeden Partner, sammeln ehrliche Bewertungen und machen den Vergleich von Offerten mühelos.",
      "Kompass a été fondée à Zürich pour apporter de la transparence dans un marché fragmenté. Nous vérifions chaque partenaire, recueillons des avis honnêtes et rendons la comparaison des offres simple et rapide.",
      "Kompass è stata fondata a Zürich per portare trasparenza in un mercato frammentato. Verifichiamo ogni partner, raccogliamo recensioni oneste e rendiamo semplicissimo il confronto delle offerte.",
    ),
    image: "/images/about-hero.png",
    mission: l(
      "Help every household in Switzerland find a fair, reliable moving partner.",
      "Jedem Haushalt in der Schweiz helfen, einen fairen und zuverlässigen Umzugspartner zu finden.",
      "Aider chaque ménage en Suisse à trouver un partenaire de déménagement équitable et fiable.",
      "Aiutare ogni economia domestica in Svizzera a trovare un partner di trasloco equo e affidabile.",
    ),
    vision: l(
      "The most trusted marketplace for home services in the DACH region.",
      "Der vertrauenswürdigste Marktplatz für Dienstleistungen rund ums Zuhause in der DACH-Region.",
      "La place de marché la plus fiable pour les services à domicile dans la région DACH.",
      "Il marketplace più affidabile per i servizi per la casa nella regione DACH.",
    ),
    values: [
      {
        icon: "ShieldCheck",
        title: l("Trust", "Vertrauen", "Confiance", "Fiducia"),
        description: l("Verified companies and moderated reviews.", "Geprüfte Unternehmen und moderierte Bewertungen.", "Entreprises vérifiées et avis modérés.", "Aziende verificate e recensioni moderate."),
      },
      {
        icon: "Eye",
        title: l("Transparency", "Transparenz", "Transparence", "Trasparenza"),
        description: l("Clear prices, no hidden fees.", "Klare Preise, keine versteckten Gebühren.", "Des prix clairs, sans frais cachés.", "Prezzi chiari, nessun costo nascosto."),
      },
      {
        icon: "HeartHandshake",
        title: l("Fairness", "Fairness", "Équité", "Equità"),
        description: l(
          "Fair offer prices for partners, free for customers.",
          "Faire Anfragepreise für Partner, kostenlos für Kunden.",
          "Des prix de demandes équitables pour les partenaires, gratuit pour les clients.",
          "Prezzi equi delle richieste per i partner, gratuito per i clienti.",
        ),
      },
    ],
    numbers: [
      { value: "2019", label: l("founded", "gegründet", "année de fondation", "anno di fondazione") },
      { value: "26", label: l("cantons covered", "abgedeckte Kantone", "cantons couverts", "cantoni coperti") },
      { value: "12k+", label: l("happy moves", "gelungene Umzüge", "déménagements réussis", "traslochi riusciti") },
      { value: "48h", label: l("average response", "durchschnittliche Antwortzeit", "délai de réponse moyen", "tempo medio di risposta") },
    ],
  },
  contact: {
    title: l("Get in touch", "Kontakt aufnehmen", "Contactez-nous", "Ci contatti"),
    subtitle: l(
      "Our team answers within one business day.",
      "Unser Team antwortet innert eines Arbeitstages.",
      "Notre équipe répond dans un délai d'un jour ouvrable.",
      "Il nostro team risponde entro un giorno lavorativo.",
    ),
    formTitle: l("Send us a message", "Senden Sie uns eine Nachricht", "Envoyez-nous un message", "Ci invii un messaggio"),
    image: "/images/contact.png",
  },
  companiesPage: {
    title: l("Verified moving companies", "Geprüfte Umzugsfirmen", "Entreprises de déménagement vérifiées", "Ditte di traslochi verificate"),
    subtitle: l(
      "Browse partners by service, region and rating.",
      "Durchsuchen Sie Partner nach Dienstleistung, Region und Bewertung.",
      "Parcourez les partenaires par service, région et note.",
      "Sfogli i partner per servizio, regione e valutazione.",
    ),
    image: "/images/companies.png",
  },
  blogsPage: {
    title: l("Moving guides & tips", "Umzugsratgeber & Tipps", "Guides & conseils déménagement", "Guide & consigli per il trasloco"),
    subtitle: l(
      "Checklists, cost guides and expert advice.",
      "Checklisten, Kostenübersichten und Expertentipps.",
      "Check-lists, guides des coûts et conseils d'experts.",
      "Checklist, guide ai costi e consigli degli esperti.",
    ),
    image: "/images/blogs-hero.png",
  },
  faqPage: {
    title: l("Help centre", "Hilfe-Center", "Centre d'aide", "Centro assistenza"),
    subtitle: l(
      "Answers to the most common questions.",
      "Antworten auf die häufigsten Fragen.",
      "Réponses aux questions les plus fréquentes.",
      "Risposte alle domande più frequenti.",
    ),
    askTitle: l("Didn't find your answer?", "Keine Antwort gefunden?", "Vous n'avez pas trouvé de réponse ?", "Non ha trovato la risposta?"),
  },
  partnerPage: {
    title: l(
      "Grow your moving business with Kompass",
      "Lassen Sie Ihr Umzugsgeschäft mit Kompass wachsen",
      "Développez votre entreprise de déménagement avec Kompass",
      "Faccia crescere la Sua ditta di traslochi con Kompass",
    ),
    subtitle: l(
      "Qualified offers in your region. Pay only for what you buy.",
      "Qualifizierte Anfragen in Ihrer Region. Sie bezahlen nur, was Sie kaufen.",
      "Des demandes qualifiées dans votre région. Vous ne payez que ce que vous achetez.",
      "Richieste qualificate nella Sua regione. Paga solo ciò che acquista.",
    ),
    benefits: [
      {
        icon: "Target",
        title: l("Qualified offers", "Qualifizierte Anfragen", "Demandes qualifiées", "Richieste qualificate"),
        description: l(
          "Detailed requests with rooms, floors and dates.",
          "Detaillierte Anfragen mit Zimmern, Stockwerken und Terminen.",
          "Des demandes détaillées avec pièces, étages et dates.",
          "Richieste dettagliate con locali, piani e date.",
        ),
      },
      {
        icon: "Wallet",
        title: l("No subscription", "Kein Abo", "Sans abonnement", "Nessun abbonamento"),
        description: l(
          "Buy offers individually from the shop.",
          "Kaufen Sie Anfragen einzeln im Shop.",
          "Achetez les demandes à l'unité dans la boutique.",
          "Acquisti le richieste singolarmente nello shop.",
        ),
      },
      {
        icon: "Star",
        title: l("Build reputation", "Reputation aufbauen", "Bâtissez votre réputation", "Costruisca la Sua reputazione"),
        description: l(
          "Collect verified reviews on your profile.",
          "Sammeln Sie verifizierte Bewertungen auf Ihrem Profil.",
          "Recueillez des avis vérifiés sur votre profil.",
          "Raccolga recensioni verificate sul Suo profilo.",
        ),
      },
      {
        icon: "LifeBuoy",
        title: l("Fair-offer guarantee", "Garantie für echte Anfragen", "Garantie de demandes fiables", "Garanzia richieste affidabili"),
        description: l(
          "Report fake offers and get credited.",
          "Melden Sie gefälschte Anfragen und erhalten Sie eine Gutschrift.",
          "Signalez les fausses demandes et obtenez un crédit.",
          "Segnali le richieste false e riceva un accredito.",
        ),
      },
    ],
    steps: [
      {
        icon: "FileText",
        title: l("Apply online", "Online bewerben", "Postulez en ligne", "Si candidi online"),
        description: l(
          "Company, contact and bank details in 5 minutes.",
          "Firmen-, Kontakt- und Bankangaben in 5 Minuten.",
          "Coordonnées de l'entreprise, de contact et bancaires en 5 minutes.",
          "Dati aziendali, di contatto e bancari in 5 minuti.",
        ),
      },
      {
        icon: "FileSignature",
        title: l("Sign the contract", "Vertrag unterzeichnen", "Signez le contrat", "Firmi il contratto"),
        description: l(
          "We verify your documents and send the contract.",
          "Wir prüfen Ihre Unterlagen und senden Ihnen den Vertrag.",
          "Nous vérifions vos documents et vous envoyons le contrat.",
          "Verifichiamo i Suoi documenti e Le inviamo il contratto.",
        ),
      },
      {
        icon: "Rocket",
        title: l("Start receiving offers", "Anfragen erhalten", "Recevez vos premières demandes", "Inizi a ricevere richieste"),
        description: l(
          "Buy offers that match your services and region.",
          "Kaufen Sie Anfragen, die zu Ihren Dienstleistungen und Ihrer Region passen.",
          "Achetez les demandes qui correspondent à vos services et à votre région.",
          "Acquisti le richieste adatte ai Suoi servizi e alla Sua regione.",
        ),
      },
    ],
    ctaTitle: l("Ready to grow?", "Bereit zu wachsen?", "Prêt à vous développer ?", "Pronto a crescere?"),
    ctaDescription: l(
      "Applications are reviewed within 2 business days.",
      "Bewerbungen werden innert 2 Arbeitstagen geprüft.",
      "Les candidatures sont examinées dans un délai de 2 jours ouvrables.",
      "Le candidature vengono esaminate entro 2 giorni lavorativi.",
    ),
  },
  legal: {
    imprint: l(
      "<h2>Imprint</h2><p><strong>Kompass Umzug GmbH</strong><br/>Bahnhofstrasse 21<br/>8001 Zürich, Switzerland</p><p>Commercial register: CHE-123.456.789<br/>Managing director: Laura Meier</p><p>Email: hello@kompassumzug.ch</p>",
      "<h2>Impressum</h2><p><strong>Kompass Umzug GmbH</strong><br/>Bahnhofstrasse 21<br/>8001 Zürich, Schweiz</p><p>Handelsregister: CHE-123.456.789<br/>Geschäftsführerin: Laura Meier</p><p>E-Mail: hello@kompassumzug.ch</p>",
      "<h2>Mentions légales</h2><p><strong>Kompass Umzug GmbH</strong><br/>Bahnhofstrasse 21<br/>8001 Zürich, Suisse</p><p>Registre du commerce : CHE-123.456.789<br/>Gérante : Laura Meier</p><p>E-mail : hello@kompassumzug.ch</p>",
      "<h2>Impressum</h2><p><strong>Kompass Umzug GmbH</strong><br/>Bahnhofstrasse 21<br/>8001 Zürich, Svizzera</p><p>Registro di commercio: CHE-123.456.789<br/>Gerente: Laura Meier</p><p>E-mail: hello@kompassumzug.ch</p>",
    ),
    privacy: l(
      "<h2>Privacy policy</h2><p>We process personal data only to deliver offers you request. Data is shared with a maximum of five partner companies.</p><h3>Your rights</h3><ul><li>Access and correction</li><li>Deletion</li><li>Objection to processing</li></ul>",
      "<h2>Datenschutzerklärung</h2><p>Wir bearbeiten Personendaten ausschliesslich, um Ihnen die angefragten Offerten zu vermitteln. Die Daten werden an höchstens fünf Partnerunternehmen weitergegeben.</p><h3>Ihre Rechte</h3><ul><li>Auskunft und Berichtigung</li><li>Löschung</li><li>Widerspruch gegen die Bearbeitung</li></ul>",
      "<h2>Politique de confidentialité</h2><p>Nous traitons les données personnelles uniquement pour vous fournir les offres que vous demandez. Les données sont transmises à cinq entreprises partenaires au maximum.</p><h3>Vos droits</h3><ul><li>Accès et rectification</li><li>Effacement</li><li>Opposition au traitement</li></ul>",
      "<h2>Informativa sulla privacy</h2><p>Trattiamo i dati personali esclusivamente per fornirLe le offerte da Lei richieste. I dati vengono condivisi con un massimo di cinque aziende partner.</p><h3>I Suoi diritti</h3><ul><li>Accesso e rettifica</li><li>Cancellazione</li><li>Opposizione al trattamento</li></ul>",
    ),
    terms: l(
      "<h2>Terms & conditions</h2><p>Kompass acts as an intermediary. Contracts for services are concluded directly between the customer and the partner company.</p><h3>Partners</h3><p>Offer prices are listed in the partner shop. Reported fake offers are reviewed within 5 business days.</p>",
      "<h2>Allgemeine Geschäftsbedingungen</h2><p>Kompass tritt als Vermittlerin auf. Verträge über Dienstleistungen werden direkt zwischen der Kundschaft und dem Partnerunternehmen abgeschlossen.</p><h3>Partner</h3><p>Die Anfragepreise sind im Partner-Shop aufgeführt. Gemeldete gefälschte Anfragen werden innert 5 Arbeitstagen geprüft.</p>",
      "<h2>Conditions générales</h2><p>Kompass agit en qualité d'intermédiaire. Les contrats de prestations sont conclus directement entre le client et l'entreprise partenaire.</p><h3>Partenaires</h3><p>Les prix des demandes figurent dans la boutique partenaires. Les fausses demandes signalées sont examinées dans un délai de 5 jours ouvrables.</p>",
      "<h2>Condizioni generali</h2><p>Kompass agisce in qualità di intermediario. I contratti di servizio sono conclusi direttamente tra il cliente e l'azienda partner.</p><h3>Partner</h3><p>I prezzi delle richieste sono indicati nello shop partner. Le richieste false segnalate vengono esaminate entro 5 giorni lavorativi.</p>",
    ),
  },
  popup: {
    enabled: true,
    title: l(
      "Autumn offer: 10% off cleaning",
      "Herbstangebot: 10 % Rabatt auf die Reinigung",
      "Offre d'automne : 10 % de réduction sur le nettoyage",
      "Offerta d'autunno: 10% di sconto sulla pulizia",
    ),
    body: l(
      "Book a move and end-of-tenancy cleaning together and save.",
      "Buchen Sie Umzug und Umzugsreinigung zusammen und sparen Sie.",
      "Réservez ensemble le déménagement et le nettoyage de fin de bail et économisez.",
      "Prenoti insieme trasloco e pulizia di fine locazione e risparmi.",
    ),
    cta: l("Request offers", "Offerten anfragen", "Demander des offres", "Richiedere offerte"),
    href: "/#offer-form",
    delaySec: 8,
  },
};

export const faqs: Faq[] = [
  {
    id: "faq-1",
    order: 1,
    question: l("Is Kompass really free?", "Ist Kompass wirklich kostenlos?", "Kompass est-il vraiment gratuit ?", "Kompass è davvero gratuito?"),
    answer: l(
      "Yes. Customers never pay Kompass. Partners pay a small fee per offer.",
      "Ja. Kunden bezahlen Kompass nie etwas. Partner zahlen eine kleine Gebühr pro Anfrage.",
      "Oui. Les clients ne paient jamais rien à Kompass. Les partenaires paient une petite commission par demande.",
      "Sì. I clienti non pagano mai nulla a Kompass. I partner pagano una piccola tariffa per ogni richiesta.",
    ),
  },
  {
    id: "faq-2",
    order: 2,
    question: l("How many offers will I receive?", "Wie viele Offerten erhalte ich?", "Combien d'offres vais-je recevoir ?", "Quante offerte riceverò?"),
    answer: l(
      "You choose between 1 and 5 offers when you submit the form.",
      "Beim Absenden des Formulars wählen Sie zwischen 1 und 5 Offerten.",
      "Vous choisissez entre 1 et 5 offres lors de l'envoi du formulaire.",
      "Al momento dell'invio del modulo sceglie tra 1 e 5 offerte.",
    ),
  },
  {
    id: "faq-3",
    order: 3,
    question: l(
      "How are partner companies verified?",
      "Wie werden die Partnerunternehmen geprüft?",
      "Comment les entreprises partenaires sont-elles vérifiées ?",
      "Come vengono verificate le aziende partner?",
    ),
    answer: l(
      "We check the commercial register extract, liability insurance and signed contract before activation.",
      "Vor der Freischaltung prüfen wir den Handelsregisterauszug, die Haftpflichtversicherung und den unterzeichneten Vertrag.",
      "Avant l'activation, nous vérifions l'extrait du registre du commerce, l'assurance responsabilité civile et le contrat signé.",
      "Prima dell'attivazione verifichiamo l'estratto del registro di commercio, l'assicurazione di responsabilità civile e il contratto firmato.",
    ),
  },
  {
    id: "faq-4",
    order: 4,
    question: l(
      "Am I obliged to accept an offer?",
      "Bin ich verpflichtet, eine Offerte anzunehmen?",
      "Suis-je obligé d'accepter une offre ?",
      "Sono obbligato ad accettare un'offerta?",
    ),
    answer: l(
      "No. Offers are free and without obligation.",
      "Nein. Die Offerten sind kostenlos und unverbindlich.",
      "Non. Les offres sont gratuites et sans engagement.",
      "No. Le offerte sono gratuite e senza impegno.",
    ),
  },
  {
    id: "faq-5",
    order: 5,
    question: l(
      "What if I am not happy with a company?",
      "Was, wenn ich mit einer Firma nicht zufrieden bin?",
      "Et si je ne suis pas satisfait d'une entreprise ?",
      "E se non sono soddisfatto di una ditta?",
    ),
    answer: l(
      "Leave a review on the company's profile after the job, or write to us through the contact form. Our team follows up on every case.",
      "Hinterlassen Sie nach dem Auftrag eine Bewertung auf dem Firmenprofil oder schreiben Sie uns über das Kontaktformular. Unser Team geht jedem Fall nach.",
      "Laissez un avis sur le profil de l'entreprise après la prestation, ou écrivez-nous via le formulaire de contact. Notre équipe donne suite à chaque cas.",
      "Lasci una recensione sul profilo della ditta dopo il lavoro, oppure ci scriva tramite il modulo di contatto. Il nostro team segue ogni caso.",
    ),
  },
  {
    id: "faq-6",
    order: 6,
    question: l(
      "When should I request offers?",
      "Wann sollte ich Offerten anfragen?",
      "Quand dois-je demander des offres ?",
      "Quando devo richiedere le offerte?",
    ),
    answer: l(
      "Ideally 4–8 weeks before your moving date.",
      "Idealerweise 4–8 Wochen vor Ihrem Umzugstermin.",
      "Idéalement 4 à 8 semaines avant la date de votre déménagement.",
      "Idealmente 4–8 settimane prima della data del trasloco.",
    ),
  },
];

/** Blog body: an intro paragraph per language, followed by shared guide sections. */
const blogBody = (en: string, de: string, fr: string, it: string) =>
  l(
    `<p>${en}</p><h2>Plan early</h2><p>Start with an inventory of every room. It helps companies quote accurately and avoids surprises on moving day.</p><h2>Compare more than price</h2><ul><li>Insurance coverage</li><li>Included packing material</li><li>Reviews from recent customers</li></ul><blockquote>Tip: request offers for the move and the cleaning together — many partners give a combined discount.</blockquote>`,
    `<p>${de}</p><h2>Frühzeitig planen</h2><p>Beginnen Sie mit einer Inventarliste für jedes Zimmer. So können die Firmen genau offerieren, und Sie vermeiden Überraschungen am Umzugstag.</p><h2>Mehr als nur den Preis vergleichen</h2><ul><li>Versicherungsschutz</li><li>Inbegriffenes Verpackungsmaterial</li><li>Aktuelle Kundenbewertungen</li></ul><blockquote>Tipp: Fragen Sie Offerten für Umzug und Reinigung gemeinsam an – viele Partner gewähren einen Kombirabatt.</blockquote>`,
    `<p>${fr}</p><h2>Planifiez tôt</h2><p>Commencez par faire l'inventaire de chaque pièce. Cela permet aux entreprises d'établir une offre précise et évite les surprises le jour du déménagement.</p><h2>Comparez plus que le prix</h2><ul><li>Couverture d'assurance</li><li>Matériel d'emballage inclus</li><li>Avis de clients récents</li></ul><blockquote>Conseil : demandez des offres pour le déménagement et le nettoyage en même temps, de nombreux partenaires accordent une remise combinée.</blockquote>`,
    `<p>${it}</p><h2>Pianifichi per tempo</h2><p>Inizi con un inventario di ogni stanza. Aiuta le aziende a formulare offerte precise ed evita sorprese il giorno del trasloco.</p><h2>Confronti più del solo prezzo</h2><ul><li>Copertura assicurativa</li><li>Materiale da imballaggio incluso</li><li>Recensioni di clienti recenti</li></ul><blockquote>Consiglio: richieda insieme le offerte per trasloco e pulizia, molti partner concedono uno sconto combinato.</blockquote>`,
  );

export const blogs: Blog[] = [
  {
    id: "blog-1",
    slug: "moving-checklist-switzerland",
    serviceId: "svc-private",
    image: "/images/blog.png",
    readMins: 6,
    published: true,
    createdAt: daysAgo(4),
    title: l(
      "The ultimate moving checklist for Switzerland",
      "Die ultimative Umzugscheckliste für die Schweiz",
      "La check-list de déménagement ultime pour la Suisse",
      "La checklist definitiva per il trasloco in Svizzera",
    ),
    excerpt: l(
      "Eight weeks to moving day: what to do, when.",
      "Acht Wochen bis zum Umzugstag: was wann zu tun ist.",
      "Huit semaines avant le jour J : que faire et quand.",
      "Otto settimane al giorno del trasloco: cosa fare e quando.",
    ),
    body: blogBody(
      "Moving in Switzerland comes with its own rules — from commune registration to strict flat handovers.",
      "Ein Umzug in der Schweiz hat seine eigenen Regeln – von der Anmeldung bei der Gemeinde bis zur strengen Wohnungsabgabe.",
      "Déménager en Suisse obéit à des règles bien précises, de l'annonce à la commune à la remise stricte de l'appartement.",
      "Traslocare in Svizzera comporta regole proprie, dalla notifica al Comune alla rigorosa riconsegna dell'appartamento.",
    ),
  },
  {
    id: "blog-2",
    slug: "how-much-does-a-move-cost",
    serviceId: "svc-private",
    image: "/images/hero.png",
    readMins: 5,
    published: true,
    createdAt: daysAgo(11),
    title: l(
      "How much does a move cost in 2026?",
      "Was kostet ein Umzug im Jahr 2026?",
      "Combien coûte un déménagement en 2026 ?",
      "Quanto costa un trasloco nel 2026?",
    ),
    excerpt: l(
      "Average prices by flat size and canton.",
      "Durchschnittspreise nach Wohnungsgrösse und Kanton.",
      "Prix moyens selon la taille du logement et le canton.",
      "Prezzi medi per dimensione dell'appartamento e cantone.",
    ),
    body: blogBody(
      "Prices vary widely by canton, floor and access. Here are realistic ranges.",
      "Die Preise variieren stark je nach Kanton, Stockwerk und Zugang. Hier finden Sie realistische Preisspannen.",
      "Les prix varient fortement selon le canton, l'étage et l'accès. Voici des fourchettes réalistes.",
      "I prezzi variano molto a seconda del cantone, del piano e dell'accesso. Ecco delle fasce realistiche.",
    ),
  },
  {
    id: "blog-3",
    slug: "handover-cleaning-guide",
    serviceId: "svc-cleaning",
    image: "/images/about-target.png",
    readMins: 4,
    published: true,
    createdAt: daysAgo(18),
    title: l(
      "Passing the flat handover first time",
      "Die Wohnungsabgabe auf Anhieb bestehen",
      "Réussir la remise de l'appartement du premier coup",
      "Superare la riconsegna dell'appartamento al primo colpo",
    ),
    excerpt: l(
      "What landlords check and how a guarantee protects you.",
      "Was die Vermieterschaft prüft und wie eine Garantie Sie schützt.",
      "Ce que vérifie le bailleur et comment une garantie vous protège.",
      "Cosa controlla il locatore e come La protegge una garanzia.",
    ),
    body: blogBody(
      "The handover protocol decides whether you get your deposit back.",
      "Das Abgabeprotokoll entscheidet darüber, ob Sie Ihre Mietkaution zurückerhalten.",
      "L'état des lieux de sortie détermine si vous récupérez votre garantie de loyer.",
      "Il verbale di riconsegna decide se Le verrà restituito il deposito cauzionale.",
    ),
  },
  {
    id: "blog-4",
    slug: "office-move-weekend",
    serviceId: "svc-private",
    image: "/images/companies.png",
    readMins: 7,
    published: true,
    createdAt: daysAgo(25),
    title: l(
      "Moving an office over one weekend",
      "Büroumzug an einem einzigen Wochenende",
      "Déménager un bureau en un seul week-end",
      "Trasferire un ufficio in un solo fine settimana",
    ),
    excerpt: l(
      "A project plan template for zero downtime.",
      "Eine Projektplan-Vorlage für einen Umzug ohne Ausfallzeit.",
      "Un modèle de plan de projet pour zéro interruption.",
      "Un modello di piano di progetto per un trasloco senza tempi di inattività.",
    ),
    body: blogBody(
      "With the right plan your team logs off on Friday and back in on Monday.",
      "Mit dem richtigen Plan meldet sich Ihr Team am Freitag ab und am Montag wieder an.",
      "Avec le bon plan, votre équipe se déconnecte le vendredi et se reconnecte le lundi.",
      "Con il piano giusto, il Suo team si disconnette il venerdì e si riconnette il lunedì.",
    ),
  },
  {
    id: "blog-5",
    slug: "decluttering-before-moving",
    serviceId: "svc-clearance",
    image: "/images/start-now.png",
    readMins: 3,
    published: true,
    createdAt: daysAgo(33),
    title: l(
      "Declutter first, move less",
      "Erst ausmisten, dann leichter umziehen",
      "Désencombrez d'abord, déménagez moins",
      "Prima fare ordine, poi traslocare meno",
    ),
    excerpt: l(
      "Fewer boxes means a cheaper move.",
      "Weniger Kartons bedeuten einen günstigeren Umzug.",
      "Moins de cartons, c'est un déménagement moins cher.",
      "Meno scatoloni significano un trasloco più economico.",
    ),
    body: blogBody(
      "Every cubic metre you don't move saves money.",
      "Jeder Kubikmeter, den Sie nicht transportieren, spart Geld.",
      "Chaque mètre cube que vous ne déménagez pas vous fait économiser de l'argent.",
      "Ogni metro cubo che non trasporta Le fa risparmiare denaro.",
    ),
  },
  {
    id: "blog-6",
    slug: "moving-abroad-customs",
    serviceId: "svc-private",
    image: "/images/blogs-hero.png",
    readMins: 8,
    published: false,
    createdAt: daysAgo(2),
    title: l(
      "Leaving Switzerland: customs made easy",
      "Wegzug aus der Schweiz: Zoll leicht gemacht",
      "Quitter la Suisse : la douane en toute simplicité",
      "Lasciare la Svizzera: la dogana resa facile",
    ),
    excerpt: l(
      "Removal goods, forms and timelines explained.",
      "Übersiedlungsgut, Formulare und Fristen erklärt.",
      "Effets de déménagement, formulaires et délais expliqués.",
      "Masserizie, moduli e tempistiche spiegati.",
    ),
    body: blogBody(
      "International moves require a removal goods declaration.",
      "Für internationale Umzüge ist eine Zollanmeldung für Übersiedlungsgut erforderlich.",
      "Les déménagements internationaux nécessitent une déclaration d'effets de déménagement.",
      "I traslochi internazionali richiedono una dichiarazione delle masserizie di trasloco.",
    ),
  },
];

export const modelOffers: ModelOffer[] = [
  {
    id: "mo-1",
    serviceId: "svc-private",
    title: l("3.5-room flat", "3.5-Zimmer-Wohnung", "Appartement de 3.5 pièces", "Appartamento di 3.5 locali"),
    route: l("Zürich → Winterthur", "Zürich → Winterthur", "Zürich → Winterthur", "Zürich → Winterthur"),
    rooms: "3.5",
    price: 1450,
    active: true,
  },
  {
    id: "mo-2",
    serviceId: "svc-cleaning",
    title: l("Handover cleaning 4.5 rooms", "Endreinigung 4.5 Zimmer", "Nettoyage de remise 4.5 pièces", "Pulizia di riconsegna 4.5 locali"),
    route: l("Bern", "Bern", "Bern", "Bern"),
    rooms: "4.5",
    price: 980,
    active: true,
  },
  {
    id: "mo-3",
    serviceId: "svc-move-clean",
    title: l("3.5 rooms: move + handover cleaning", "3.5 Zimmer: Umzug + Endreinigung", "3.5 pièces : déménagement + nettoyage de remise", "3.5 locali: trasloco + pulizia di riconsegna"),
    route: l("Lausanne → Vevey", "Lausanne → Vevey", "Lausanne → Vevey", "Lausanne → Vevey"),
    rooms: "3.5",
    price: 2650,
    active: true,
  },
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
    name: l("Super admin", "Super-Admin", "Super-administrateur", "Super amministratore"),
    description: l(
      "Full access to every module.",
      "Vollzugriff auf alle Module.",
      "Accès complet à tous les modules.",
      "Accesso completo a tutti i moduli.",
    ),
    permissions: ["dashboard", "leads", "partners", "finance", "moderation", "inbox", "insights", "cms", "settings"],
  },
  {
    id: "role-editor",
    name: l("Content editor", "Inhaltsredaktor", "Rédacteur de contenu", "Redattore di contenuti"),
    description: l(
      "Website content, reviews and inbox.",
      "Website-Inhalte, Bewertungen und Posteingang.",
      "Contenu du site, avis et boîte de réception.",
      "Contenuti del sito, recensioni e posta in arrivo.",
    ),
    permissions: ["dashboard", "cms", "moderation", "inbox"],
  },
  {
    id: "role-finance",
    name: l("Finance", "Finanzen", "Finances", "Finanze"),
    description: l(
      "Dues, coupons, shop and partner wallets.",
      "Einzahlungen, Gutscheine, Shop und Partner-Wallets.",
      "Paiements, coupons, boutique et portefeuilles des partenaires.",
      "Pagamenti, coupon, shop e portafogli dei partner.",
    ),
    permissions: ["dashboard", "finance", "leads", "partners"],
  },
  {
    id: "role-support",
    name: l("Support agent", "Support-Mitarbeiter", "Agent de support", "Operatore di supporto"),
    description: l(
      "Offers, reviews and customer messages.",
      "Anfragen, Bewertungen und Kundennachrichten.",
      "Demandes, avis et messages clients.",
      "Richieste, recensioni e messaggi dei clienti.",
    ),
    permissions: ["dashboard", "leads", "moderation", "inbox", "insights"],
  },
];

export const users: AdminUser[] = [
  { id: "u-1", name: "Laura Meier", email: "laura@kompassumzug.ch", phone: "+41 79 111 22 33", roleId: "role-super", active: true, lastLogin: daysAgo(0, -1) },
  { id: "u-2", name: "Omar Haddad", email: "omar@kompassumzug.ch", phone: "+41 78 222 33 44", roleId: "role-editor", active: true, lastLogin: daysAgo(1) },
  { id: "u-3", name: "Sandra Keller", email: "sandra@kompassumzug.ch", phone: "+41 76 333 44 55", roleId: "role-finance", active: true, lastLogin: daysAgo(2) },
  { id: "u-4", name: "Nadia Rossi", email: "nadia@kompassumzug.ch", phone: "+41 77 444 55 66", roleId: "role-support", active: false, lastLogin: daysAgo(40) },
];
