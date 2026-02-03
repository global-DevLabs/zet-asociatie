import type { Member, Payment } from "@/types"
import { RANKS, UNITS, PROFILES } from "@/lib/constants"

const getRandomItem = <T,>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)]

const getRandomDate = (start: Date, end: Date) => {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString().split("T")[0]
}

const generateMockPayments = (memberId: string, startYear: number): Payment[] => {
  const payments: Payment[] = []
  const currentYear = new Date().getFullYear()

  for (let year = startYear; year <= currentYear; year++) {
    if (Math.random() > 0.2) {
      payments.push({
        id: `PAY-${memberId}-${year}`,
        memberId,
        year,
        date: `${year}-03-15`,
        amount: 120,
        method: "Numerar" as const,
        receiptNumber: `CH-${year}-${Math.floor(Math.random() * 10000)}`,
      })
    }
  }
  return payments
}

const ACTIVITIES_TEMPLATES = [
  "Grup General - membri activi",
  "Grup Operativ - coordonare acțiuni",
  "Grup Suport - Fundație",
]

const ORGANIZATION_INVOLVEMENT_OPTIONS = [
  "Participare regulată la ședințe lunare și acțiuni ale sucursalei",
  "Implicare în organizarea evenimentelor comemorative",
  "Contribuții la susținerea membrilor cu nevoi",
  "Participare activă în programe de caritate",
  "Mentoring și susținere pentru membri noi",
  "Implicare în activități de advocacy și reprezentare",
]

const MAGAZINE_CONTRIBUTIONS_OPTIONS = [
  "Articol 'Experiențe din carieră militară' - 2023",
  "Poezie 'Cuvintele inimii' - 2022",
  "Reportaj 'Povești ale vrerii' - 2023",
  "Editorial 'Continuitate și deschidere' - 2024",
  "Fără contribuții",
  "Articol 'Amintiri de la Academia Navală' - 2023",
]

const BRANCH_NEEDS_OPTIONS = [
  "Asistență medicală și consultații",
  "Ajutor material pentru situații de dificultate",
  "Susținere în procesarea documentelor administrative",
  "Incluziune în activități sociale și culturale",
  "Fără solicitări curente",
  "Sprijin pentru probleme locative",
]

const FOUNDATION_NEEDS_OPTIONS = [
  "Program de burse și educație",
  "Asistență pentru pensionari cu venituri reduse",
  "Programe de sănătate și recreație",
  "Fără solicitări",
  "Sprijin pentru situații de urgență socială",
]

const CAR_STATUS_OPTIONS = ["Membru activ", "Membru retras", "Membru fondator", "Membru în perioada de probă"]

const FOUNDATION_STATUS_OPTIONS = ["Donator", "Beneficiar program", "Voluntar", "Nu este implicat"]

const OBSERVATIONS_OPTIONS = [
  "Regim de pensie militară. Stare de sănătate bună.",
  "Doritor de implicare mai activă în proiecte de voluntariat.",
  "Locuitor în provincie - participare limitată la întâlniri.",
  "Relație strânsă cu organizația. Potențial pentru rol de lider local.",
  "Angajat în domeniu privat. Disponibilitate weekenduri.",
  "Fără observații speciale. Participare regulată.",
]

export const generateMockMembers = (count = 50): Member[] => {
  return Array.from({ length: count }).map((_, i) => {
    const memberCode = String(1000 + i).padStart(5, "0") // 5-digit numeric format: 01000, 01001, etc.
    const id = `member-${Date.now()}-${Math.random().toString(36).substr(2, 9)}-${i}`
    const firstName = ["Ion", "Vasile", "Gheorghe", "Mihai", "Alexandru", "Constantin", "Elena", "Maria", "Ana"][
      Math.floor(Math.random() * 9)
    ]
    const lastName = ["Popescu", "Ionescu", "Radu", "Dumitru", "Stoica", "Dobre", "Stan", "Matei"][
      Math.floor(Math.random() * 8)
    ]

    const enrollmentYear = 2010 + Math.floor(Math.random() * 14)
    const isWithdrawn = Math.random() > 0.9

    return {
      id,
      memberCode,
      rank: getRandomItem(RANKS),
      firstName,
      lastName,
      dateOfBirth: getRandomDate(new Date(1950, 0, 1), new Date(1985, 0, 1)),
      cnp: `${Math.floor(Math.random() * 1000000000000)}`,
      birthplace: "București",
      unit: getRandomItem(UNITS),
      mainProfile: getRandomItem(PROFILES),
      retirementYear: 2000 + Math.floor(Math.random() * 20),
      retirementDecisionNumber: `DEC-${Math.floor(Math.random() * 1000)}`,
      retirementFileNumber: `DOS-${Math.floor(Math.random() * 1000)}`,
      branchEnrollmentYear: enrollmentYear,
      branchWithdrawalYear: isWithdrawn ? enrollmentYear + Math.floor(Math.random() * 5) : undefined,
      branchWithdrawalReason: isWithdrawn ? "Motive personale" : undefined,
      address: `Strada Exemplului Nr. ${Math.floor(Math.random() * 100)}, București`,
      phone: `07${Math.floor(Math.random() * 100000000)}`,
      email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@example.com`,
      whatsappGroups: ACTIVITIES_TEMPLATES.slice(0, Math.random() > 0.5 ? 2 : 3),
      organizationInvolvement: getRandomItem(ORGANIZATION_INVOLVEMENT_OPTIONS),
      magazineContributions: getRandomItem(MAGAZINE_CONTRIBUTIONS_OPTIONS),
      branchNeeds: getRandomItem(BRANCH_NEEDS_OPTIONS),
      foundationNeeds: getRandomItem(FOUNDATION_NEEDS_OPTIONS),
      otherNeeds: Math.random() > 0.7 ? "Acces la programe de formare și dezvoltare" : undefined,
      carMemberStatus: getRandomItem(CAR_STATUS_OPTIONS),
      foundationMemberStatus: getRandomItem(FOUNDATION_STATUS_OPTIONS),
      currentWorkplace:
        Math.random() > 0.5
          ? "Pensionar"
          : ["Compania X SRL", "Ministerul Apărării", "Sector privat", "Comerț"][Math.floor(Math.random() * 4)],
      otherObservations: getRandomItem(OBSERVATIONS_OPTIONS),
      payments: generateMockPayments(memberCode, enrollmentYear),
    }
  })
}

export const MOCK_MEMBERS = generateMockMembers(50)
