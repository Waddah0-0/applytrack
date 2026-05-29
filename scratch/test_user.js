const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, '..', 'database.json');
const email = "saumon6@gmail.com";
const password = "jqzsqbebrhbulfmy";

async function main() {
  console.log("Checking if local user login works...");
  
  try {
    const loginRes = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    
    const loginData = await loginRes.json();
    if (loginData.success) {
      console.log("✅ Login worked out of the box!");
      console.log("Token:", loginData.token);
      return;
    }
    
    console.log("❌ Login failed:", loginData.message);
  } catch (err) {
    console.error("Connection error:", err.message);
  }
  
  console.log("Updating password hash in database.json to match user password...");
  try {
    const dbContent = fs.readFileSync(DB_FILE, 'utf8');
    const db = JSON.parse(dbContent);
    const user = db.localUsers.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (user) {
      const hash = await bcrypt.hash(password, 10);
      user.password = hash;
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      console.log("✅ Updated password hash in database.json successfully!");
    } else {
      console.log("User saumon6@gmail.com not found in localUsers. Creating one...");
      const hash = await bcrypt.hash(password, 10);
      const newUser = {
        id: "user-" + Date.now(),
        email: email.toLowerCase(),
        password: hash,
        createdAt: new Date().toISOString()
      };
      db.localUsers.push(newUser);
      fs.writeFileSync(DB_FILE, JSON.stringify(db, null, 2), 'utf8');
      console.log("✅ Created user saumon6@gmail.com in database.json successfully!");
    }
    
    // Test login again
    const loginRes2 = await fetch("http://localhost:3001/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
    const loginData2 = await loginRes2.json();
    if (loginData2.success) {
      console.log("✅ Login succeeded after update!");
      console.log("Token:", loginData2.token);
    } else {
      console.log("❌ Login still failed:", loginData2.message);
    }
  } catch (err) {
    console.error("Failed to update database.json:", err.message);
  }
}

main();
