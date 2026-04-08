async function run() {
  try {
    const loginRes = await fetch('https://sams-api-vfvj.onrender.com/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'admin@sams.local', password: 'Admin123!' })
    });
    const loginData = await loginRes.json();
    console.log("Login res:", loginData);
    const token = loginData.token;

    console.log("Logged into PROD.");

    const garagesRes = await fetch('https://sams-api-vfvj.onrender.com/api/garages', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    const garagesList = await garagesRes.json();
    console.log("garagesList type:", Array.isArray(garagesList) ? "array" : typeof garagesList, garagesList);
    
    // Find Birch Mount
    let birch = garagesList.find(g => g.name && g.name.includes("Birch"));
    if (!birch && garagesList.length > 0) birch = garagesList[0];
    const garageId = birch?.id;

    console.log(`Using PROD Garage ID: ${garageId}`);

    const payload = {
      garageId,
      fromName: 'TTC Birch Dispatch',
      fromEmail: 'birch@sams.local',
      replyToEmail: 'dispatch@sams.local',
      harveyToEmail: 'noreply@sams.local',
      providerType: 'SMTP',
      active: true
    };

    const postProf = await fetch(`https://sams-api-vfvj.onrender.com/api/email-centre/profiles`, {
      method: 'POST',
      headers: { 
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    console.log(`Prod CURL Proof (POST /api/email-centre/profiles): HTTP ${postProf.status}`);
    console.log(await postProf.text());

    const getProf = await fetch(`https://sams-api-vfvj.onrender.com/api/email-centre/profiles`, {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log(`Prod CURL Proof (GET /api/email-centre/profiles): HTTP ${getProf.status}`);
    
    const profs = await getProf.json();
    console.log(JSON.stringify(profs, null, 2));

  } catch(e) {
    console.error(e);
  }
}
run();
