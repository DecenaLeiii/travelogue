export type CultureBlock = {
  id: string;
  kind: 'text' | 'list' | 'location';
  title: string;
  body: string;
  address: string;
  phone: string;
  email: string;
  archived: boolean;
};

export type CultureBuiltIn = 'mission' | 'programs' | 'contact';
export const CULTURE_BUILT_INS: CultureBuiltIn[] = ['mission', 'programs', 'contact'];

export type SiteBranding = {
  logo: string;
  culture_hidden: CultureBuiltIn[];
  culture_blocks: CultureBlock[];
  hero_video: string;
  hero_description: string;
  tourism_heading: string;
  tourism_description: string;
  mission_heading: string;
  mission_text: string;
  key_programs_heading: string;
  key_programs: string[];
  contact_heading: string;
  contact_email: string;
  contact_phone: string;
};

export const DEFAULT_SITE_BRANDING: SiteBranding = {
  logo: '/dot-logo.png',
  culture_hidden: [],
  culture_blocks: [],
  hero_video: '/TOURISM%20VIDEO.mp4',
  hero_description: 'Explore beaches, mountains, history, and culture across featured destinations.',
  tourism_heading: 'Tourism & Culture',
  tourism_description: 'Discover what makes the Philippines a top travel destination for food, heritage, and natural beauty.',
  mission_heading: 'Mission',
  mission_text: 'To promote sustainable tourism and empower communities across the archipelago through responsible travel and cultural heritage.',
  key_programs_heading: 'Key Programs',
  key_programs: [
    'Tourism promotion and international marketing',
    'Community-based and sustainable tourism development',
    'Capacity building for tourism stakeholders',
    'Quality assurance and safety standards',
  ],
  contact_heading: 'Contact',
  contact_email: 'dot-feedback@tourism.gov.ph',
  contact_phone: '+63 (2) 8459-5200',
};
