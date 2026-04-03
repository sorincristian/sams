async function run() {
  console.log('--- Verifying Login on PRODUCTION APP ---');
  try {
    const res = await fetch('https://sams-api-vfvj.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sams.local', password: 'Admin123!' })
    });
    
    if (res.ok) {
      const data = await res.json();
      console.log('[SUCCESS] Login successful!', {
        statusCode: res.status,
        user: {
            email: data.user.email,
            role: data.user.role,
        },
        tokenReceived: !!data.token
      });
    } else {
      const err = await res.text();
      console.log('[ERROR] Login failed:', res.status, err);
    }
  } catch(e: any) {
    console.log('[ERROR] Fetch error:', e.message);
  }
}

run();
