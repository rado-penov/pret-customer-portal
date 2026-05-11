# NetSuite Customer Portal – Setup Guide

## 1. NetSuite Configuration

### 1a. Create a Contact Custom Field
`Customisation > Lists, Records & Fields > Contact Fields > New`

| Setting | Value |
|---|---|
| Label | Portal Password Hash |
| ID | `_portal_pwd_hash` (NetSuite prefixes → `custentity_portal_pwd_hash`) |
| Type | Free-Form Text |
| Store Value | Yes |

### 1b. Create a NetSuite Integration (TBA)
`Setup > Integration > Manage Integrations > New`

- Enable **Token-Based Authentication**
- Save → note down **Consumer Key** and **Consumer Secret**

Then create a Token:
`Setup > Users/Roles > Access Tokens > New`

- Application: the integration above
- User: a service user with Customer/Transaction read access + Customer Payment create
- Note down **Token ID** and **Token Secret**

### 1c. Deploy the Payment RESTlet
1. Upload `netsuite-scripts/portal_payment_restlet.js` to the File Cabinet
2. `Customisation > Scripting > Scripts > New` → select the file
3. Set Script Type = RESTlet, `post` function = `post`
4. Create a deployment → note the **Script ID** and **Deployment ID**

---

## 2. Portal Setup

```bash
cd netsuite-customer-portal
npm install
cp .env.example .env.local
```

Edit `.env.local` with your NetSuite credentials and IDs.

---

## 3. Granting Customer Access

For each customer contact:

1. Generate a password hash:
   ```bash
   node scripts/hash-password.js MySecurePassword123
   ```
2. Open the Contact record in NetSuite
3. Paste the hash into the **Portal Password Hash** field
4. Save

The customer logs in with:
- **Username**: their contact email address
- **Password**: the plain-text password you set in step 1

To reset: generate a new hash, update the Contact field.

---

## 4. Running the Portal

```bash
# Development
npm run dev

# Production
npm run build
npm start
```

---

## 5. Security Notes

- Passwords are bcrypt-hashed (cost 12) — raw passwords never stored
- JWT sessions are httpOnly, Secure, SameSite=Lax — 8 hour expiry
- All API routes re-validate the session on every request
- SuiteQL queries scope every query to `entity = {customerId}` — customers can never see each other's data
- The RESTlet validates that each invoice belongs to the requesting customer before applying payment
- NetSuite credentials live only in server-side env vars — never exposed to the browser
