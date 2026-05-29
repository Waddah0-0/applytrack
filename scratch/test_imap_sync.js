const email = "saumon6@gmail.com";
const password = "jqzsqbebrhbulfmy";

async function main() {
  console.log("Starting IMAP synchronization test...");
  
  // 1. Login
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
  console.log("✅ Logged in successfully!");

  // 2. Save settings (demoMode: false so it connects to real IMAP!)
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
      daysToFetch: 30,
      limit: 100,
      demoMode: false
    })
  });
  
  const settingsData = await settingsRes.json();
  if (settingsData.success) {
    console.log("✅ IMAP Settings saved successfully with demoMode=false!");
  } else {
    console.error("❌ Failed to save settings:", settingsData.message);
    return;
  }

  // 3. Trigger email sync
  console.log("🔄 Fetching and parsing career emails from IMAP...");
  try {
    const emailsRes = await fetch("http://localhost:3001/api/emails", {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${token}`
      }
    });
    
    console.log("Response status:", emailsRes.status);
    const emailsData = await emailsRes.json();
    
    if (emailsData.success) {
      console.log(`✅ Success! Scanned and fetched ${emailsData.emails?.length || 0} career emails.`);
      if (emailsData.emails && emailsData.emails.length > 0) {
        console.log("First email preview:", {
          id: emailsData.emails[0].id,
          from: emailsData.emails[0].from,
          subject: emailsData.emails[0].subject,
          category: emailsData.emails[0].category,
          company: emailsData.emails[0].company,
          role: emailsData.emails[0].role
        });
      }
    } else {
      console.error("❌ Email fetch API returned failure:", emailsData.message);
      if (emailsData.error) {
        console.error("Details:", emailsData.error);
      }
    }
  } catch (err) {
    console.error("❌ Connection failed during email fetching:", err.message);
  }
}

main();
