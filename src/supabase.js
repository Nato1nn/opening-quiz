import { createClient } from "@supabase/supabase-js"

const supabaseUrl = "https://gnebsvltjbpwqdruprex.supabase.co"
const supabaseKey = "sb_publishable_nnsvfdTxSr7ODIU9jRKoDA_KsuXc1so"

export const supabase = createClient(supabaseUrl, supabaseKey)