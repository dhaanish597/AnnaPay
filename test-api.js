const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'YOUR_ANON_KEY';

const testNotifications = [
  {
    role: 'Admin',
    priority: 'HIGH',
    message: 'Critical: Payroll system requires immediate attention'
  },
  {
    role: 'HR',
    priority: 'MEDIUM',
    message: 'New employee onboarding documents are ready for review'
  },
  {
    role: 'Finance',
    priority: 'HIGH',
    message: 'Monthly payroll processing completed - review required'
  },
  {
    role: 'Admin',
    priority: 'LOW',
    message: 'System maintenance scheduled for this weekend'
  },
  {
    role: 'HR',
    priority: 'HIGH',
    message: 'Urgent: Employee benefit enrollment deadline approaching'
  },
  {
    role: 'Finance',
    priority: 'MEDIUM',
    message: 'Quarterly tax reports are now available'
  }
];

async function sendNotification(notification) {
  const url = `${SUPABASE_URL}/functions/v1/notify`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(notification)
    });

    const data = await response.json();

    if (response.ok) {
      console.log('✓ Notification sent:', notification.message.substring(0, 50) + '...');
      return { success: true, data };
    } else {
      console.error('✗ Failed:', data.error);
      return { success: false, error: data.error };
    }
  } catch (error) {
    console.error('✗ Network error:', error.message);
    return { success: false, error: error.message };
  }
}

async function runTests() {
  console.log('🚀 Testing Payroll Notification System API\n');
  console.log(`Endpoint: ${SUPABASE_URL}/functions/v1/notify\n`);

  let successCount = 0;
  let failureCount = 0;

  for (const notification of testNotifications) {
    const result = await sendNotification(notification);
    if (result.success) {
      successCount++;
    } else {
      failureCount++;
    }
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n📊 Test Results:');
  console.log(`   ✓ Successful: ${successCount}`);
  console.log(`   ✗ Failed: ${failureCount}`);
  console.log(`   Total: ${testNotifications.length}`);
}

if (SUPABASE_URL === 'YOUR_SUPABASE_URL' || SUPABASE_ANON_KEY === 'YOUR_ANON_KEY') {
  console.error('❌ Error: Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables');
  console.log('\nUsage:');
  console.log('  export VITE_SUPABASE_URL=your-url');
  console.log('  export VITE_SUPABASE_ANON_KEY=your-key');
  console.log('  node test-api.js');
  process.exit(1);
}

runTests();
