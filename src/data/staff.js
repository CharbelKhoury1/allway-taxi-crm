export const STAFF_LIST = [
  { id: 'nour',   init: 'NJ', cls: 'av-y', name: 'Nour Jamil',      phone: '+961 71 100 200', roleBadge: 'b-blue',   role: 'Dispatcher', statusBadge: 'b-green', status: 'On shift' },
  { id: 'rami',   init: 'RK', cls: 'av-g', name: 'Rami Karam',      phone: '+961 70 200 300', roleBadge: 'b-blue',   role: 'Dispatcher', statusBadge: 'b-green', status: 'On shift' },
  { id: 'ziad',   init: 'ZA', cls: 'av-p', name: 'Ziad Abi Khalil', phone: '+961 76 300 400', roleBadge: 'b-yellow', role: 'Supervisor', statusBadge: 'b-green', status: 'On shift' },
  { id: 'hiba',   init: 'HM', cls: 'av-b', name: 'Hiba Mrad',       phone: '+961 78 400 500', roleBadge: 'b-green',  role: 'Support',    statusBadge: 'b-amber', status: 'Break' },
  { id: 'pierre', init: 'PG', cls: 'av-r', name: 'Pierre Gemayel',  phone: '+961 79 500 600', roleBadge: 'b-blue',   role: 'Dispatcher', statusBadge: 'b-gray',  status: 'Off shift' },
  { id: 'lynn',   init: 'LN', cls: 'av-x', name: 'Lynn Nassar',     phone: '+961 71 600 700', roleBadge: 'b-green',  role: 'Support',    statusBadge: 'b-gray',  status: 'Off shift' },
]

export const STAFF_DETAIL = {
  nour: {
    init: 'NJ', cls: 'av-y', name: 'Nour Jamil',
    contact: '+961 71 100 200 · nour@wallwaytaxi.com',
    roleBadge: 'b-blue', role: 'Dispatcher', statusBadge: 'b-green', status: 'On shift',
    orders: '142', rating: '4.8', perf: '94%',
    clockIn: '8:00 AM', clockOut: '4:00 PM', hours: '6h 14m',
    perms: [['Assign drivers','b-green','Allowed'],['Cancel orders','b-green','Allowed'],['Issue refunds','b-red','Restricted'],['View financials','b-red','Restricted']],
  },
  rami: {
    init: 'RK', cls: 'av-g', name: 'Rami Karam',
    contact: '+961 70 200 300 · rami@wallwaytaxi.com',
    roleBadge: 'b-blue', role: 'Dispatcher', statusBadge: 'b-green', status: 'On shift',
    orders: '98', rating: '4.6', perf: '88%',
    clockIn: '9:00 AM', clockOut: '5:00 PM', hours: '5h 14m',
    perms: [['Assign drivers','b-green','Allowed'],['Cancel orders','b-green','Allowed'],['Issue refunds','b-red','Restricted'],['View financials','b-red','Restricted']],
  },
  ziad: {
    init: 'ZA', cls: 'av-p', name: 'Ziad Abi Khalil',
    contact: '+961 76 300 400 · ziad@wallwaytaxi.com',
    roleBadge: 'b-yellow', role: 'Supervisor', statusBadge: 'b-green', status: 'On shift',
    orders: '210', rating: '4.9', perf: '91%',
    clockIn: '7:00 AM', clockOut: '3:00 PM', hours: '7h 14m',
    perms: [['Assign drivers','b-green','Allowed'],['Cancel orders','b-green','Allowed'],['Issue refunds','b-green','Allowed'],['View financials','b-green','Allowed']],
  },
  hiba: {
    init: 'HM', cls: 'av-b', name: 'Hiba Mrad',
    contact: '+961 78 400 500 · hiba@wallwaytaxi.com',
    roleBadge: 'b-green', role: 'Support', statusBadge: 'b-amber', status: 'On break',
    orders: '76', rating: '4.5', perf: '82%',
    clockIn: '10:00 AM', clockOut: '6:00 PM', hours: '4h 14m',
    perms: [['Assign drivers','b-red','Restricted'],['Cancel orders','b-green','Allowed'],['Issue refunds','b-red','Restricted'],['View financials','b-red','Restricted']],
  },
  pierre: {
    init: 'PG', cls: 'av-r', name: 'Pierre Gemayel',
    contact: '+961 79 500 600 · pierre@wallwaytaxi.com',
    roleBadge: 'b-blue', role: 'Dispatcher', statusBadge: 'b-gray', status: 'Off shift',
    orders: '54', rating: '4.3', perf: '74%',
    clockIn: '2:00 PM', clockOut: '10:00 PM', hours: '—',
    perms: [['Assign drivers','b-green','Allowed'],['Cancel orders','b-green','Allowed'],['Issue refunds','b-red','Restricted'],['View financials','b-red','Restricted']],
  },
  lynn: {
    init: 'LN', cls: 'av-x', name: 'Lynn Nassar',
    contact: '+961 71 600 700 · lynn@wallwaytaxi.com',
    roleBadge: 'b-green', role: 'Support', statusBadge: 'b-gray', status: 'Off shift',
    orders: '38', rating: '4.4', perf: '79%',
    clockIn: '6:00 PM', clockOut: '12:00 AM', hours: '—',
    perms: [['Assign drivers','b-red','Restricted'],['Cancel orders','b-green','Allowed'],['Issue refunds','b-red','Restricted'],['View financials','b-red','Restricted']],
  },
}
