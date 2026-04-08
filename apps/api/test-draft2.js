const fetch = globalThis.fetch;

(async () => {
    try {
        const loginRes = await fetch('http://127.0.0.1:3000/api/v1/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'dev@local', password: 'bypass' })
        });
        const loginResult = await loginRes.json();
        const token = loginResult.token;

        const resDraft = await fetch('http://127.0.0.1:3000/api/v1/seat-orders', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ garageId: 'cmni776yt000653mocbmakr94', lines: [] })
        });
        
        console.log('[API PROOF] Draft Response Code:', resDraft.status);
        if(!resDraft.ok) {
           console.log('[API ERROR]', await resDraft.text());
        } else {
           console.log('[API PROOF] Success:', await resDraft.json());
        }
    } catch(e) {
        console.error('Error:', e);
    }
})();
