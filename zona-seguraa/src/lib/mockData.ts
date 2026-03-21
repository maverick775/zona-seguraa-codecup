// Mock data service for Zona SeguRAA application
export interface Alert {
  id: string;
  type: 'security' | 'medical' | 'fire' | 'evacuation' | 'other';
  level: 1 | 2 | 3 | 4;
  status: 'active' | 'validated' | 'in_progress' | 'resolved' | 'false_alarm' | 'cancelled';
  description: string;
  zone_id: string;
  created_by_nick: string;
  created_at: string;
  validation_ratio?: number;
  votes?: Vote[];
  timeline?: TimelineEvent[];
  recommendations?: string[];
}

export interface Vote {
  id: string;
  alert_id: string;
  nickname: string;
  role: 'visitor' | 'ally' | 'coordinator';
  weight: number;
  comment?: string;
  created_at: string;
}

export interface TimelineEvent {
  id: string;
  alert_id: string;
  event_type: string;
  description: string;
  timestamp: string;
  user_role?: string;
}

export interface Zone {
  id: string;
  slug: string;
  name: string;
  city: string;
  active: boolean;
}

export interface Node {
  id: string;
  name: string;
  type: 'avp_physical' | 'avp_simulated' | 'medical_point' | 'exit' | 'emergency_exit' | 'meeting_point';
  status: 'online' | 'offline' | 'alert' | 'in_progress' | 'maintenance';
  pos_x: number;
  pos_y: number;
  lat?: number;
  lng?: number;
  zone_id: string;
}

export interface User {
  nickname: string;
  zone_id: string;
  language: 'es' | 'en';
  role: 'visitor' | 'ally' | 'coordinator';
}

// Mock data
export const mockZones: Zone[] = [
  {
    id: 'zone-1',
    slug: 'zona-centro',
    name: 'Zona Centro',
    city: 'Ciudad de México',
    active: true
  }
];

export const mockNodes: Node[] = [
  {
    id: 'node-1',
    name: 'Punto Médico Principal',
    type: 'medical_point',
    status: 'online',
    pos_x: 100,
    pos_y: 150,
    lat: 19.4326,
    lng: -99.1332,
    zone_id: 'zone-1'
  },
  {
    id: 'node-2',
    name: 'Salida de Emergencia Norte',
    type: 'emergency_exit',
    status: 'online',
    pos_x: 200,
    pos_y: 100,
    lat: 19.4350,
    lng: -99.1300,
    zone_id: 'zone-1'
  },
  {
    id: 'node-3',
    name: 'Punto de Reunión Este',
    type: 'meeting_point',
    status: 'online',
    pos_x: 300,
    pos_y: 200,
    lat: 19.4300,
    lng: -99.1250,
    zone_id: 'zone-1'
  }
];

export const mockAlerts: Alert[] = [
  {
    id: 'alert-1',
    type: 'medical',
    level: 3,
    status: 'active',
    description: 'Persona requiere atención médica urgente en el área principal',
    zone_id: 'zone-1',
    created_by_nick: 'usuario123',
    created_at: new Date().toISOString(),
    validation_ratio: 0.65,
    votes: [
      {
        id: 'vote-1',
        alert_id: 'alert-1',
        nickname: 'ally01',
        role: 'ally',
        weight: 2,
        comment: 'Confirmado, se necesita ambulancia',
        created_at: new Date().toISOString()
      },
      {
        id: 'vote-2',
        alert_id: 'alert-1',
        nickname: 'visitor01',
        role: 'visitor',
        weight: 1,
        created_at: new Date().toISOString()
      }
    ],
    timeline: [
      {
        id: 'timeline-1',
        alert_id: 'alert-1',
        event_type: 'created',
        description: 'Alerta creada por usuario123',
        timestamp: new Date().toISOString(),
        user_role: 'visitor'
      },
      {
        id: 'timeline-2',
        alert_id: 'alert-1',
        event_type: 'validated',
        description: 'Alerta validada por ally01',
        timestamp: new Date().toISOString(),
        user_role: 'ally'
      }
    ],
    recommendations: [
      'Contactar servicios médicos de emergencia',
      'Despejar área para acceso de ambulancia',
      'Mantener vía aérea despejada'
    ]
  },
  {
    id: 'alert-2',
    type: 'security',
    level: 2,
    status: 'validated',
    description: 'Actividad sospechosa reportada cerca del acceso principal',
    zone_id: 'zone-1',
    created_by_nick: 'seguridad01',
    created_at: new Date(Date.now() - 3600000).toISOString(),
    validation_ratio: 0.80,
    votes: [
      {
        id: 'vote-3',
        alert_id: 'alert-2',
        nickname: 'coordinator01',
        role: 'coordinator',
        weight: 3,
        comment: 'Enviando personal de seguridad',
        created_at: new Date().toISOString()
      }
    ]
  }
];

export const mockCurrentUser: User = {
  nickname: 'usuario_actual',
  zone_id: 'zone-1',
  language: 'es',
  role: 'visitor'
};

// Mock API functions
export const mockApi = {
  // Alerts
  createAlert: async (alertData: Omit<Alert, 'id' | 'created_at' | 'validation_ratio'>) => {
    const newAlert: Alert = {
      ...alertData,
      id: `alert-${Date.now()}`,
      created_at: new Date().toISOString(),
      validation_ratio: 0
    };
    mockAlerts.push(newAlert);
    return newAlert;
  },

  getAlerts: async (zoneSlug: string, status?: string) => {
    return mockAlerts.filter(alert => 
      alert.zone_id === zoneIdFromSlug(zoneSlug) &&
      (!status || alert.status === status)
    );
  },

  getAlert: async (id: string) => {
    return mockAlerts.find(alert => alert.id === id);
  },

  voteAlert: async (alertId: string, voteData: Omit<Vote, 'id' | 'created_at'>) => {
    const newVote: Vote = {
      ...voteData,
      id: `vote-${Date.now()}`,
      created_at: new Date().toISOString()
    };
    
    const alert = mockAlerts.find(a => a.id === alertId);
    if (alert) {
      if (!alert.votes) alert.votes = [];
      alert.votes.push(newVote);
      
      // Update validation ratio
      const totalWeight = alert.votes.reduce((sum, v) => sum + v.weight, 0);
      alert.validation_ratio = Math.min(totalWeight / 5, 1); // Normalize to 0-1
    }
    
    return newVote;
  },

  // Zones
  getZone: async (slug: string) => {
    return mockZones.find(zone => zone.slug === slug);
  },

  getNodes: async (zoneSlug: string) => {
    return mockNodes.filter(node => node.zone_id === zoneIdFromSlug(zoneSlug));
  }
};

function zoneIdFromSlug(slug: string): string {
  const zone = mockZones.find(z => z.slug === slug);
  return zone?.id || '';
}
