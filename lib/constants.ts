export const RANKS = [
  "General",
  "Amiral",
  "General-locotenent",
  "Viceamiral",
  "General-maior",
  "Contraamiral",
  "General de brigadă",
  "General de flotilă aeriană",
  "Contraamiral de flotilă",
  "Colonel",
  "Comandor",
  "Locotenent-colonel",
  "Căpitan-comandor",
  "Maior",
  "Locotenent-comandor",
  "Căpitan",
  "Locotenent-major",
  "Locotenent",
  "Sublocotenent",
  "Aspirant",
  "Maistru militar principal",
  "Maistru militar clasa I",
  "Maistru militar clasa II",
  "Maistru militar clasa III",
  "Maistru militar clasa IV",
  "Maistru militar clasa V",
  "Plutonier adjutant șef",
  "Plutonier adjutant principal",
  "Plutonier adjutant",
  "Plutonier major",
  "Plutonier",
  "Sergent major",
  "Sergent",
  "Caporal clasa I",
  "Caporal clasa II",
  "Caporal clasa III",
  "Fruntaș",
  "Soldat",
]

export const UNIT_CODES = [
  "UM 0754",
  "UM 0724",
  "UM 0102",
  "UM 0106",
  "UM 0110",
  "UM 0113",
  "UM 0121",
  "UM 0127",
  "UM 0131",
  "UM 0136",
  "UM 0139",
  "UM 0146",
  "UM 0147",
  "UM 0151",
  "UM 0153",
  "UM 0156",
  "UM 0164",
  "UM 0165",
  "UM 0167",
  "UM 0192",
  "UM 0193",
  "UM 0195",
  "UM 0196",
  "UM 0198",
  "UM 0200",
  "UM 0201",
  "UM 0209",
  "UM 0215",
  "UM 0221",
  "UM 0232",
  "UM 02448",
  "UM 0289",
  "UM 0292",
  "UM 0296",
  "UM 0315",
  "UM 0318",
  "UM 0349",
  "UM 0356",
  "UM 0362",
  "UM 0376",
  "UM 0384",
  "UM 0399",
  "UM 0401",
  "UM 0404",
  "UM 0408",
  "UM 0418",
  "UM 0445",
  "UM 0456",
  "UM 0458",
  "UM 0461",
]

// Kept for backwards compatibility - will be removed once all references are updated
export const UNITS = UNIT_CODES

export const PROFILES = ["Comandă", "Logistică", "Informații", "Comunicații", "Medical", "Juridic"]

export const PAYMENT_TYPES = ["Taxă de înscriere", "Cotizație", "Taxă de reînscriere"] as const

export const PAYMENT_METHODS = ["Numerar", "Card / Online", "Transfer Bancar"] as const

export const PAYMENT_STATUSES = ["Plătită", "Scadentă", "Restanță"] as const

// Deprecated - kept for backwards compatibility, will be removed
export const OLD_PAYMENT_METHODS = ["Numerar", "Card / Online", "Transfer Bancar", "Reținere pe stat"]

export const WITHDRAWAL_REASONS: string[] = [
  "Retras la cerere",
  "Plecat în alt județ",
  "Reactivat",
  "Decedat",
  "Exclus disciplinar",
  "Neplată cotizație",
]

export const PROVENANCE_OPTIONS: string[] = [
  "Prin pensionare",
  "Sosit din alt județ",
  "Prin reînscriere",
  "Prin demisie",
]
