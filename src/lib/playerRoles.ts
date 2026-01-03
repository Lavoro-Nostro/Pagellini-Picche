// Player roles and their specific grading fields

export type PlayerRole = 'martello' | 'opposto' | 'libero' | 'centrale' | 'palleggio';

export interface PlayerRoleConfig {
  role: PlayerRole;
  fields: string[];
  fieldLabels: Record<string, string>;
}

// Define role configurations with their specific fields
export const ROLE_CONFIGS: Record<PlayerRole, { fields: string[]; fieldLabels: Record<string, string> }> = {
  martello: {
    fields: ['battuta', 'attacchi', 'ricezione_difesa'],
    fieldLabels: {
      battuta: 'Battuta',
      attacchi: 'Attacchi',
      ricezione_difesa: 'Ricezione/Difesa',
    },
  },
  opposto: {
    fields: ['battuta', 'attacchi', 'difesa'],
    fieldLabels: {
      battuta: 'Battuta',
      attacchi: 'Attacchi',
      difesa: 'Difesa',
    },
  },
  libero: {
    fields: ['ricezione', 'difesa', 'appoggi_alzate'],
    fieldLabels: {
      ricezione: 'Ricezione',
      difesa: 'Difesa',
      appoggi_alzate: 'Appoggi/Alzate',
    },
  },
  centrale: {
    fields: ['battuta', 'attacchi', 'muri'],
    fieldLabels: {
      battuta: 'Battuta',
      attacchi: 'Attacchi',
      muri: 'Muri',
    },
  },
  palleggio: {
    fields: ['battuta', 'alzate', 'difesa'],
    fieldLabels: {
      battuta: 'Battuta',
      alzate: 'Alzate',
      difesa: 'Difesa',
    },
  },
};

// Map each player to their role
export const PLAYER_ROLE_MAP: Record<string, PlayerRole> = {
  'Alessio Livi': 'martello',
  'Elisa': 'martello',
  'Giulia': 'martello',
  'Greta': 'martello',
  'Fabio': 'opposto',
  'Filippo': 'opposto',
  'Laura': 'opposto',
  'Alex': 'libero',
  'Martina': 'libero',
  'Nisia': 'libero',
  'Alessio Pecci': 'centrale',
  'Gaetano': 'centrale',
  'Matteo': 'centrale',
  'Francesco': 'palleggio',
  'Giorgia': 'palleggio',
  'Tobias': 'palleggio',
};

// Get players grouped by role
export const getPlayersByRole = (): Record<PlayerRole, string[]> => {
  const grouped: Record<PlayerRole, string[]> = {
    martello: [],
    opposto: [],
    libero: [],
    centrale: [],
    palleggio: [],
  };

  Object.entries(PLAYER_ROLE_MAP).forEach(([player, role]) => {
    grouped[role].push(player);
  });

  return grouped;
};

// Get role display name
export const ROLE_DISPLAY_NAMES: Record<PlayerRole, string> = {
  martello: 'Martello',
  opposto: 'Opposto',
  libero: 'Libero',
  centrale: 'Centrale',
  palleggio: 'Palleggio',
};

// Players in alphabetical order as specified
export const ALL_PLAYERS = [
  'Alessio Livi',
  'Alessio Pecci',
  'Alex',
  'Elisa',
  'Fabio',
  'Filippo',
  'Francesco',
  'Gaetano',
  'Giorgia',
  'Giulia',
  'Greta',
  'Laura',
  'Martina',
  'Matteo',
  'Nisia',
  'Tobias',
];

// Get fields for a specific player
export const getPlayerFields = (playerName: string): string[] => {
  const role = PLAYER_ROLE_MAP[playerName];
  if (!role) return [];
  return ROLE_CONFIGS[role].fields;
};

// Get field labels for a specific player
export const getPlayerFieldLabels = (playerName: string): Record<string, string> => {
  const role = PLAYER_ROLE_MAP[playerName];
  if (!role) return {};
  return ROLE_CONFIGS[role].fieldLabels;
};

// Get player role
export const getPlayerRole = (playerName: string): PlayerRole | null => {
  return PLAYER_ROLE_MAP[playerName] || null;
};

// Get fields for a role
export const getFieldsForRole = (role: PlayerRole): ('battuta' | 'attacchi' | 'ricezione_difesa' | 'difesa' | 'ricezione' | 'appoggi_alzate' | 'muri' | 'alzate')[] => {
  return ROLE_CONFIGS[role].fields as ('battuta' | 'attacchi' | 'ricezione_difesa' | 'difesa' | 'ricezione' | 'appoggi_alzate' | 'muri' | 'alzate')[];
};

// Field labels for display
export const FIELD_LABELS: Record<string, string> = {
  battuta: 'Battuta',
  attacchi: 'Attacchi',
  ricezione_difesa: 'Ricezione/Difesa',
  difesa: 'Difesa',
  ricezione: 'Ricezione',
  appoggi_alzate: 'Appoggi/Alzate',
  muri: 'Muri',
  alzate: 'Alzate',
};
