export const LOC_ICONS = {
  Home:     { bg: 'rgba(93,202,165,.15)',  color: '#5DCAA5', svg: '<path d="M2 8.5L8 2l6 6.5"/><path d="M4 7v6h3v-3h2v3h3V7"/>' },
  Work:     { bg: 'rgba(85,138,221,.15)',  color: '#85B7EB', svg: '<rect x="2" y="6" width="12" height="8" rx="1"/><path d="M5 6V4a1 1 0 011-1h4a1 1 0 011 1v2"/><line x1="8" y1="10" x2="8" y2="10"/>' },
  Gym:      { bg: 'rgba(245,184,0,.15)',   color: '#F5B800', svg: '<circle cx="4" cy="8" r="1.5"/><circle cx="12" cy="8" r="1.5"/><line x1="5.5" y1="8" x2="10.5" y2="8" stroke-width="2.5"/>' },
  Airport:  { bg: 'rgba(175,169,236,.15)', color: '#AFA9EC', svg: '<path d="M2 11l2-6 4 2 4-4 1 1-3 5 2 1-1 2-3-2-1 3-2-1 1-3z"/>' },
  School:   { bg: 'rgba(239,159,39,.15)',  color: '#EF9F27', svg: '<rect x="2" y="6" width="12" height="8" rx="1"/><path d="M5 6V5a3 3 0 016 0v1"/><line x1="8" y1="9" x2="8" y2="11"/>' },
  Hospital: { bg: 'rgba(240,149,149,.15)', color: '#F09595', svg: '<rect x="2" y="2" width="12" height="12" rx="1.5"/><line x1="8" y1="5" x2="8" y2="11"/><line x1="5" y1="8" x2="11" y2="8"/>' },
  default:  { bg: 'var(--surface2)',       color: 'var(--text-ter)', svg: '<circle cx="8" cy="7" r="3"/><path d="M8 14s-5-4.5-5-7a5 5 0 0110 0c0 2.5-5 7-5 7z"/>' },
}

export const CUSTOMERS = {
  ahmad: {
    init: 'AK', cls: 'av-y', name: 'Ahmad Khalil', phone: '+961 71 234 567', lang: 'Arabic',
    badge: 'b-yellow', badgeText: 'VIP customer', trips: '34', spend: '$284', rating: '4.9',
    locs: [
      ['Home',    'Hamra St., near Bliss, Beirut',  '12', 'b-yellow'],
      ['Work',    'Verdun 732, 3rd floor',           '8',  'b-green'],
      ['Gym',     'Fitness First, Kaslik',            '3',  'b-gray'],
      ['Airport', 'Beirut–Rafic Hariri Intl',         '6',  'b-blue'],
    ],
  },
  sara: {
    init: 'SR', cls: 'av-g', name: 'Sara Rizk', phone: '+961 70 345 678', lang: 'English',
    badge: 'b-green', badgeText: 'Regular', trips: '12', spend: '$98', rating: '4.6',
    locs: [
      ['Home',    'Mar Nicolas St., Achrafieh',  '7', 'b-green'],
      ['Work',    'Saifi Village, Downtown',      '4', 'b-blue'],
      ['Airport', 'Beirut–Rafic Hariri Intl',     '2', 'b-gray'],
    ],
  },
  bassem: {
    init: 'BN', cls: 'av-r', name: 'Bassem Nader', phone: '+961 76 456 789', lang: 'Arabic',
    badge: 'b-red', badgeText: 'Blocked', trips: '2', spend: '$14', rating: '2.1',
    locs: [
      ['Home', 'Dora Highway, Beirut', '2', 'b-red'],
    ],
  },
  maya: {
    init: 'MH', cls: 'av-b', name: 'Maya Haddad', phone: '+961 78 567 890', lang: 'French',
    badge: 'b-green', badgeText: 'Regular', trips: '8', spend: '$67', rating: '4.7',
    locs: [
      ['Home',   'Raouche, Beirut',            '5', 'b-green'],
      ['Work',   'ABC Mall, Ashrafieh',         '3', 'b-blue'],
      ['School', 'AUB Campus, Bliss St.',       '2', 'b-amber'],
      ['Gym',    "Gold's Gym, Dbayeh",          '1', 'b-gray'],
    ],
  },
  lara: {
    init: 'LF', cls: 'av-p', name: 'Lara Farah', phone: '+961 79 678 901', lang: 'English',
    badge: 'b-yellow', badgeText: 'VIP customer', trips: '21', spend: '$187', rating: '4.8',
    locs: [
      ['Home',     'Zalka Highway, Block A',               '9', 'b-yellow'],
      ['Work',     'Gemmayzeh, Mar Mikhael',                '7', 'b-blue'],
      ['Gym',      'Fitness Zone, Jal el Dib',              '4', 'b-green'],
      ['Hospital', 'Hotel-Dieu de France, Ashrafieh',       '2', 'b-red'],
      ['Airport',  'Beirut–Rafic Hariri Intl',              '3', 'b-gray'],
    ],
  },
}

export const CUSTOMER_LIST = [
  { id: 'ahmad', init: 'AK', cls: 'av-y', name: 'Ahmad Khalil', phone: '+961 71 234 567', trips: '34', badge: 'b-yellow', badgeText: 'VIP' },
  { id: 'sara',  init: 'SR', cls: 'av-g', name: 'Sara Rizk',    phone: '+961 70 345 678', trips: '12', badge: 'b-green',  badgeText: 'Regular' },
  { id: 'bassem',init: 'BN', cls: 'av-r', name: 'Bassem Nader', phone: '+961 76 456 789', trips: '2',  badge: 'b-red',    badgeText: 'Blocked' },
  { id: 'maya',  init: 'MH', cls: 'av-b', name: 'Maya Haddad',  phone: '+961 78 567 890', trips: '8',  badge: 'b-green',  badgeText: 'Regular' },
  { id: 'lara',  init: 'LF', cls: 'av-p', name: 'Lara Farah',   phone: '+961 79 678 901', trips: '21', badge: 'b-yellow', badgeText: 'VIP' },
]
