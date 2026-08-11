const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://eqkhddgmhpropbzwiqmd.supabase.co';
const supabaseKey = 'sb_publishable_zrr_UTGOMHGfA2-N2KItLA_mYN-2Avg';

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log('Fetching orders from Supabase...');
  const { data: orders, error } = await supabase.from('orders').select('*');
  if (error) {
    console.error('Fetch error:', error);
    return;
  }
  console.log(`Found ${orders.length} orders in Supabase.`);
  if (orders.length > 0) {
    console.log('First 3 orders:');
    orders.slice(0, 3).forEach(o => console.log(o.id, o.customer_name, o.product_name, o.purchase_date));
  }
}

run();
