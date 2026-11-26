import { createClient } from '@supabase/supabase-js'

// अपने Supabase प्रोजेक्ट की असली URL और Anon Key यहाँ डालें
const SUPABASE_URL = 'https://ptprizoqxeyeymwjhasl.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ewy1EP4RDd76IV4vIojGKA_WoQaUgrR'

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)