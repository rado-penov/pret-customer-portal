/**
 * Admin utility: generate a bcrypt hash for a portal password.
 * Run: node scripts/hash-password.js <password>
 * Paste the output into the Contact record's custentity_portal_pwd_hash field in NetSuite.
 */

const bcrypt = require("bcryptjs");

const password = process.argv[2];
if (!password) {
  console.error("Usage: node scripts/hash-password.js <password>");
  process.exit(1);
}

bcrypt.hash(password, 12).then((hash) => {
  console.log("\nPassword hash (paste into NetSuite Contact field):\n");
  console.log(hash);
  console.log();
});
