import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ofurvromibbqgzbvzbsx.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9mdXJ2cm9taWJicWd6YnZ6YnN4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg0OTc5MjEsImV4cCI6MjA4NDA3MzkyMX0.JufTH0lwnu_LXzqsUTP3jly2GQoUc4Kjy-LT_lbtbk0'

export const supabase = createClient(supabaseUrl, supabaseKey)
