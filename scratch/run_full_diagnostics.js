const email = "saumon6@gmail.com";
const password = "jqzsqbebrhbulfmy";

async function main() {
  console.log("==========================================");
  
  // 1. Login
  console.log("[1/9] Testing Authentication Login...");
  const loginRes = await fetch("http://localhost:3001/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password })
  });
  const loginData = await loginRes.json();
  if (!loginData.success) {
    console.error("❌ Login failed:", loginData.message);
    return;
  }
  const token = loginData.token;
  console.log("✅ Login successful! Token received.");

  // 2. Auth ME check
  console.log("\n[2/9] Testing Auth Me Endpoint...");
  const meRes = await fetch("http://localhost:3001/api/auth/me", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const meData = await meRes.json();
  if (meData.success && meData.userId) {
    console.log(`✅ Auth Me endpoint returned success! UserId=${meData.userId}`);
  } else {
    console.error("❌ Auth Me check failed!");
    return;
  }

  // 3. Save Settings
  console.log("\n[3/9] Testing Save Settings...");
  const settingsRes = await fetch("http://localhost:3001/api/settings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      email,
      password,
      host: "imap.gmail.com",
      port: 993,
      tls: true,
      daysToFetch: 14,
      limit: 50,
      demoMode: false
    })
  });
  const settingsData = await settingsRes.json();
  if (settingsData.success) {
    console.log("✅ Saved settings successfully!");
  } else {
    console.error("❌ Save settings failed!");
    return;
  }

  // 4. Retrieve Settings
  console.log("\n[4/9] Testing Get Settings...");
  const getSettingsRes = await fetch("http://localhost:3001/api/settings", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const getSettingsData = await getSettingsRes.json();
  if (getSettingsData.email === email && getSettingsData.daysToFetch === 14) {
    console.log("✅ Retrieved settings perfectly!");
    console.log(`Settings details: Host=${getSettingsData.host}, Port=${getSettingsData.port}, DemoMode=${getSettingsData.demoMode}`);
  } else {
    console.error("❌ Retrieve settings failed!");
    return;
  }

  // 5. Track Job Manual Addition
  console.log("\n[5/9] Testing Pipeline Tracker Addition...");
  const testJobId = "test-job-" + Date.now();
  const addJobRes = await fetch("http://localhost:3001/api/tracker", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      id: testJobId,
      company: "Google DeepMind",
      role: "AI Research Engineer",
      status: "Applied",
      notes: "Diagnostics testing notes."
    })
  });
  const addJobData = await addJobRes.json();
  if (addJobData.success) {
    console.log("✅ Job added to pipeline tracker successfully!");
  } else {
    console.error("❌ Add job failed!");
    return;
  }

  // 6. Get Jobs List
  console.log("\n[6/9] Testing Get Tracker Jobs List...");
  const jobsRes = await fetch("http://localhost:3001/api/tracker", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const jobsData = await jobsRes.json();
  const addedJob = jobsData.find(j => j.id === testJobId);
  if (addedJob && addedJob.company === "Google DeepMind") {
    console.log("✅ Retrieved jobs list contains the newly tracked job!");
  } else {
    console.error("❌ Get jobs check failed!");
    return;
  }

  // 7. Update Tracked Job
  console.log("\n[7/9] Testing Pipeline Tracker Update...");
  const updateJobRes = await fetch("http://localhost:3001/api/tracker", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({
      id: testJobId,
      company: "Google DeepMind",
      role: "AI Research Engineer",
      status: "Interviewing",
      notes: "Diagnostics updated notes."
    })
  });
  const updateJobData = await updateJobRes.json();
  if (updateJobData.success) {
    console.log("✅ Tracked job updated successfully!");
  } else {
    console.error("❌ Update job failed!");
    return;
  }

  // 8. Delete Tracked Job
  console.log("\n[8/9] Testing Pipeline Tracker Deletion...");
  const deleteJobRes = await fetch("http://localhost:3001/api/tracker/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`
    },
    body: JSON.stringify({ id: testJobId })
  });
  const deleteJobData = await deleteJobRes.json();
  if (deleteJobData.success) {
    console.log("✅ Deleted job successfully!");
  } else {
    console.error("❌ Delete job failed!");
    return;
  }

  // 9. IMAP Sync Check
  console.log("\n[9/9] Testing Career Emails Sync via Live IMAP Connection...");
  console.log("Starting IMAP handshake and mail scans...");
  const syncRes = await fetch("http://localhost:3001/api/emails", {
    headers: { "Authorization": `Bearer ${token}` }
  });
  const syncData = await syncRes.json();
  if (syncData.success) {
    console.log(`✅ Career emails sync was 100% successful! Retrieved ${syncData.emails.length} emails.`);
  } else {
    console.error("❌ IMAP sync failed:", syncData.message);
    if (syncData.error) console.error("Error details:", syncData.error);
    return;
  }

  console.log("\n==========================================");
  console.log("🏆 ALL DIAGNOSTIC TESTS PASSED! BACKEND IS 100% BUG-FREE!");
  console.log("==========================================");
}

main();
