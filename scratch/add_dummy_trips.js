import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  'https://hfybipzfzmxucuiaxbeu.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhmeWJpcHpmem14dWN1aWF4YmV1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwMTE1OTMsImV4cCI6MjA5MTU4NzU5M30.EBOrBEk-_d02799FL3JjcNkRCi-sED0T_ZnTrksdicY'
)

async function run() {
  console.log('Searching for driver "Karim"...')
  const { data: drivers, error: dErr } = await supabase.from('drivers').select('*').ilike('full_name', '%Karim%')
  
  if (dErr || !drivers.length) {
    console.error('Driver not found:', dErr || 'No match')
    process.exit(1)
  }

  const karim = drivers[0]
  console.log(`Found Karim (ID: ${karim.id})`)

  console.log('Fetching a dummy customer...')
  const { data: customers } = await supabase.from('customers').select('id').limit(1)
  const customerId = customers?.[0]?.id || null

  const trips = [
    {
      pickup_address: 'Beirut International Airport',
      dropoff_address: 'Hamra Main Street, Beirut',
      status: 'requested',
      fare_usd: 25,
      distance_km: 12.5,
      customer_id: customerId
    },
    {
      pickup_address: 'ABC Mall, Achrafieh',
      dropoff_address: 'Badaro Street',
      status: 'dispatching',
      driver_id: karim.id,
      fare_usd: 15,
      distance_km: 4.2,
      customer_id: customerId
    }
  ]

  console.log('Inserting dummy trips...')
  const { error: tErr } = await supabase.from('trips').insert(trips)

  if (tErr) {
    console.error('Error inserting trips:', tErr)
  } else {
    console.log('Successfully added 2 dummy trips for Karim!')
  }
}

run()
