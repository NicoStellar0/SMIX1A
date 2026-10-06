const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://dcfolrywagjtxrkbkqin.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRjZm9scnl3YWdqdHhya2JrcWluIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTEyNzE0NjcsImV4cCI6MjEwNjg0NzQ2N30.BWskdkr3OrDrrPEB_GCy3Y1ohtOXlcY6x0ymnD2qmHI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
  const { data: messages, error: err1 } = await supabase
    .from('messages')
    .select('*, profiles(id, full_name, role)')
    .eq('channel', 'general')
    .order('created_at', { ascending: true });
    
  console.log('Messages Read:', messages?.length, 'Error:', err1);
  console.log('First message:', JSON.stringify(messages?.[0], null, 2));
}
test();
