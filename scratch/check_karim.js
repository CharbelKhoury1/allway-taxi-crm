
import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
)

async function checkKarim() {
  const { data, error } = await supabase
    .from('drivers')
    .select('*')
    .eq('full_name', 'Karim Mansour')
  
  if (error) {
    console.error('Error fetching Karim:', error.message)
    return
  }
  
  if (data.length === 0) {
    console.log('Karim Mansour not found in drivers table.')
  } else {
    console.log('Karim Mansour found:', data[0])
  }
}

checkKarim()
