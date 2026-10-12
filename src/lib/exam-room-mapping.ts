export type RoomConfig = {
  id: string
  name: string
  modality: 'IRM' | 'Scanner' | 'Échographie' | 'Radiographie'
  equipment: string
  status: 'En Service' | 'En Maintenance' | 'Hors Service'
  color: 'blue' | 'green' | 'yellow' | 'purple' | 'pink'
  assignedExams: string[]
}

export const INITIAL_ROOMS_CONFIG: RoomConfig[] = [
  {
    id: '1',
    name: 'Salle IRM 1 (Siemens 3T)',
    modality: 'IRM',
    equipment: 'Siemens Magnetom Vida 3.0T',
    status: 'En Service',
    color: 'blue',
    assignedExams: ['IRM Cérébrale', 'IRM Rachis Lombaires', 'IRM Cardiaque', 'IRM Genou', 'IRM Abdominale'],
  },
  {
    id: '2',
    name: 'Salle Scanner 2 (128 Coupes)',
    modality: 'Scanner',
    equipment: 'GE Revolution CT 128',
    status: 'En Service',
    color: 'green',
    assignedExams: ['Scanner CT Abdomino-Pelvien', 'Scanner CT Thoracique', 'Angio-Scanner', 'Scanner Cérébral'],
  },
  {
    id: '3',
    name: 'Salle Échographie 3',
    modality: 'Échographie',
    equipment: 'Canon Aplio i800 HD',
    status: 'En Service',
    color: 'yellow',
    assignedExams: ['Échographie Abdominale', 'Échographie Doppler Carotidien', 'Échographie Pelvienne', 'Échographie Thyroidienne'],
  },
  {
    id: '4',
    name: 'Salle Radiographie 4',
    modality: 'Radiographie',
    equipment: 'Philips DigitalDiagnost C90',
    status: 'En Service',
    color: 'pink',
    assignedExams: ['Mammographie Numérique HD', 'Radiographie Thoracique', 'Radiographie Osseuse', 'Radiographie Rachis'],
  },
]

export const EXAM_ROOM_MAP: Record<string, string[]> = {
  'IRM Cérébrale': ['Salle IRM 1 (Siemens 3T)', 'Salle IRM 1', 'Salle A - IRM 3T'],
  'IRM Cérébrale 3T': ['Salle IRM 1 (Siemens 3T)', 'Salle IRM 1', 'Salle A - IRM 3T'],
  'IRM Rachis Lombaires': ['Salle IRM 1 (Siemens 3T)', 'Salle IRM 1', 'Salle A - IRM 3T'],
  'IRM Cardiaque': ['Salle IRM 1 (Siemens 3T)', 'Salle IRM 1', 'Salle A - IRM 3T'],
  'Scanner CT Abdomino-Pelvien': ['Salle Scanner 2 (128 Coupes)', 'Salle Scanner 2', 'Salle B - Scanner CT'],
  'Scanner CT Thoracique': ['Salle Scanner 2 (128 Coupes)', 'Salle Scanner 2', 'Salle B - Scanner CT'],
  'Scanner CT 128 Coupes': ['Salle Scanner 2 (128 Coupes)', 'Salle Scanner 2', 'Salle B - Scanner CT'],
  'Échographie Abdominale': ['Salle Échographie 3', 'Salle Écho 3', 'Salle C - Échographie'],
  'Échographie Doppler Carotidien': ['Salle Échographie 3', 'Salle Écho 3', 'Salle C - Échographie'],
  'Mammographie Numérique HD': ['Salle Radiographie 4', 'Salle Mammo', 'Salle D - Radiographie'],
  'Radiographie Thoracique': ['Salle Radiographie 4', 'Salle D - Radiographie'],
}

export function getRoomsForExam(examType: string, customRooms?: RoomConfig[]): string[] {
  if (customRooms && customRooms.length > 0) {
    const matching = customRooms.filter(r => {
      if (r.status === 'Hors Service') return false
      if (r.modality.toLowerCase() === examType.toLowerCase()) return true
      return r.assignedExams.some(e => e.toLowerCase().includes(examType.toLowerCase()) || examType.toLowerCase().includes(e.toLowerCase()))
    })
    if (matching.length > 0) {
      return matching.map(m => m.name)
    }
  }

  if (!examType) return ['Salle IRM 1 (Siemens 3T)', 'Salle Scanner 2 (128 Coupes)', 'Salle Échographie 3', 'Salle Radiographie 4']
  const key = Object.keys(EXAM_ROOM_MAP).find(k => k.toLowerCase().includes(examType.toLowerCase()) || examType.toLowerCase().includes(k.toLowerCase()))
  if (key && EXAM_ROOM_MAP[key]) {
    return EXAM_ROOM_MAP[key]
  }
  if (examType.toLowerCase().includes('irm')) {
    return ['Salle IRM 1 (Siemens 3T)', 'Salle IRM 1', 'Salle A - IRM 3T']
  }
  if (examType.toLowerCase().includes('scanner') || examType.toLowerCase().includes('ct')) {
    return ['Salle Scanner 2 (128 Coupes)', 'Salle Scanner 2', 'Salle B - Scanner CT']
  }
  if (examType.toLowerCase().includes('écho') || examType.toLowerCase().includes('echo')) {
    return ['Salle Échographie 3', 'Salle Écho 3', 'Salle C - Échographie']
  }
  if (examType.toLowerCase().includes('radio') || examType.toLowerCase().includes('mammo')) {
    return ['Salle Radiographie 4', 'Salle Mammo', 'Salle D - Radiographie']
  }
  return ['Salle IRM 1 (Siemens 3T)', 'Salle Scanner 2 (128 Coupes)', 'Salle Échographie 3', 'Salle Radiographie 4']
}

