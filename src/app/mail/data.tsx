export interface PatientRecord {
  id: string
  name: string
  email: string
  age: number
  gender: string
  socialSecNo: string
  examType: string
  doctor: string
  subject: string
  text: string
  reportText: string
  date: string
  read: boolean
  labels: string[]
  imageUrl: string
  prescription: {
    medications: Array<{ name: string; dosage: string; posology: string; duration: string }>
    instructions: string
  }
}

export const mails: PatientRecord[] = [
  {
    id: "pat-001-irm-cerebrale",
    name: "Jean Dupont",
    email: "j.dupont@email.com",
    age: 45,
    gender: "Homme",
    socialSecNo: "1 79 05 75 123 456 78",
    examType: "IRM Cérébrale 3T",
    doctor: "Dr. Bernard (Généraliste)",
    subject: "Compte-Rendu IRM Cérébrale & Vasculaire - Jean Dupont",
    text: "Séquences réalisées: T1, T2, FLAIR, Diffusion et SWI en coupes millimétriques 3D. Absence d'anomalie de signal intracérébrale récente. Structures ventriculaires et citernes de la base d'aspect normal.",
    reportText: "COMPTE-RENDU D'IMAGERIE PAR RÉSONANCE MAGNÉTIQUE (IRM 3T)\n\nIndication: Céphalées persistantes récurrentes.\nRésultats:\n- Système ventriculaire de taille et de morphologie normales.\n- Absence de foyer d'ischémie aiguë en séquence de Diffusion.\n- Pas de lésion expansive intra ou extra-axiale.\n- Structure vasculaire du polygone de Willis perméable.\nConclusion: Examen IRM cérébral 3T dans les limites de la normale. Pas de signe d'hypertension intracrânienne.",
    date: "2026-08-28T09:30:00",
    read: true,
    labels: ["IRM 3T", "Cérébral", "Validé"],
    imageUrl: "https://images.unsplash.com/photo-1516549655169-df83a0774514?auto=format&fit=crop&w=800&q=80",
    prescription: {
      medications: [
        { name: "Doliprane 1000mg", dosage: "1 gélule", posology: "Toutes les 8 heures si douleur", duration: "5 jours" },
        { name: "Magnesium B6", dosage: "2 comprimés", posology: "Matin et soir pendant les repas", duration: "30 jours" },
      ],
      instructions: "Proposer une consultation de contrôle en cas de récidive des symptômes. Repos conseillé."
    }
  },
  {
    id: "pat-002-scanner-abdominal",
    name: "Marie Curie",
    email: "m.curie@email.com",
    age: 52,
    gender: "Femme",
    socialSecNo: "2 74 08 92 234 567 89",
    examType: "Scanner CT Abdomino-Pelvien",
    doctor: "Dr. Leroy (Rhumatologue)",
    subject: "Bilan Tomodensitométrique Abdominal - Marie Curie",
    text: "Acquisition hélicoïdale sans et avec injection de produit de contraste iodé aux temps artériel et portal. Foie de taille et de densité normales sans lésion focale.",
    reportText: "SCANNER ABDOMINO-PELVIEN AVEC INJECTION DE CONTRASTE\n\nIndication: Douleurs hypochondre droit et bilan de lithiase.\nRésultats:\n- Vésicule biliaire de taille normale, pas d'épaississement pariétal.\n- Pancreas, rate et glandes surrénales d'aspect normal.\n- Reins de taille normale, bonne excrétion bilatérale sans dilatation des cavités pyélocalicielles.\nConclusion: Scanner abdomino-pelvien rassurant. Absence d'épanchement péritonéal.",
    date: "2026-08-27T11:15:00",
    read: true,
    labels: ["Scanner CT", "Abdominal", "Validé"],
    imageUrl: "https://images.unsplash.com/photo-1579684385127-1ef15d508118?auto=format&fit=crop&w=800&q=80",
    prescription: {
      medications: [
        { name: "Spasfon 80mg", dosage: "2 lyoc", posology: "Au moment des crises douloureuses", duration: "7 jours" },
        { name: "Citrate de Bétaïne", dosage: "1 ampoule", posology: "Avant chaque repas", duration: "10 jours" },
      ],
      instructions: "Hydratation abondante (1.5L d'eau/jour). Éviter les aliments trop gras."
    }
  }
]

export type Mail = PatientRecord

export const accounts = [
  {
    label: "Prof. Marc Laurent",
    email: "m.laurent@radiomed.fr",
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="text-primary">
        <title>RadioMed</title>
        <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
      </svg>
    ),
  },
  {
    label: "Dr. Sophie Martin",
    email: "s.martin@radiomed.fr",
    icon: (
      <svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" className="text-emerald-500">
        <title>Échographie</title>
        <circle cx="12" cy="12" r="9" fill="currentColor" />
      </svg>
    ),
  },
]

export type Account = (typeof accounts)[number]
