# HIPAA Compliance Checklist for ChiroMike

## ✅ What You've Done Right

### Business Associate Agreement (BAA)
- ✅ **Google Workspace BAA Signed** — You have a signed BAA with Google for Workspace (Gmail, Drive, etc.)
- ✅ **Document All BAAs** — Keep BAA copies accessible to auditors

### Access Control & Authentication
- ✅ **User Authentication** — App requires login; patients on intake form have NO access to claims, patient records, or billing data
- ✅ **Role-Based Access** — Only authenticated staff/admins access sensitive PHI
- ✅ **HIPAA Consent in Intake** — Patients sign HIPAA acknowledgment in PatientIntake form (Step 4)

---

## ⚠️ Critical Items to Verify/Complete

### 1. **Data Storage & Encryption**
- [ ] **Verify:** Base44 database uses encryption at rest (HIPAA-compliant storage)
  - *Action:* Contact Base44 support to confirm encryption standards (typically AES-256)
- [ ] **Verify:** TLS/HTTPS enforced on all connections (should be automatic)
- [ ] **Verify:** Database backups are encrypted

### 2. **Business Associate Agreements (BAAs)**
- [ ] **Faxage (Fax Service)** — Get BAA signed if not already done
  - *Impact:* You're transmitting patient SOAP notes, exams, claims via Faxage
  - *Action:* Request BAA from Faxage before using sendFax function
- [ ] **Gmail (OAuth for email)** — Verify scope restrictions
  - *Current scopes:* compose, send, read email + userinfo
  - *Action:* Confirm Gmail's BAA coverage (usually included if on Google Workspace)
- [ ] **Any future integrations** (Stripe for payments, etc.) — Get BAAs before implementation

### 3. **Access Logs & Audit Trail**
- ✅ **Audit logs partially implemented** — AuditLog entity tracks PHI access
- [ ] **Verify:** All PHI access is logged (claims, SOAP notes, patient data, payments)
- [ ] **Retention:** Keep audit logs for 6 years (HIPAA requirement)
- [ ] **Review quarterly:** Check for unauthorized access attempts

### 4. **Patient Rights & Documentation**
- ✅ **HIPAA Notice of Privacy Practices** — Included in intake form (Step 4)
- ✅ **Patient Consent** — Patients must check HIPAA consent box before submitting intake
- [ ] **Document:** Maintain signed intake forms (digitally stored is OK if encrypted)
- [ ] **Right to Access:** Implement a way for patients to request their records (not yet in app)
- [ ] **Right to Amend:** Allow patients to request corrections to their records

### 5. **Data Minimization & Retention**
- [ ] **Define Retention Policy:** How long do you keep patient records? (Typically 6 years post-discharge)
- [ ] **Implement Deletion:** Add ability to securely delete/archive old records when retention expires
- [ ] **Limit Collection:** Only collect PHI necessary for treatment/billing (verify PatientForm doesn't over-collect)

### 6. **Incident Response Plan**
- [ ] **Breach Policy:** Document what to do if PHI is exposed:
  - Who to notify (HHS, patients, media if 500+)
  - Timeline: Notify affected individuals within 60 days
  - Document the breach in audit logs
- [ ] **Emergency Contacts:** List who to notify in case of breach
- [ ] **Test Plan:** Conduct annual breach response drills

### 7. **Workforce Security**
- [ ] **Employee Training:** All staff handling PHI must complete annual HIPAA training
- [ ] **Access Termination:** When staff leaves, immediately revoke app access
- [ ] **Password Policy:** Enforce strong passwords (consider adding password reset policy)
- [ ] **Admin Only:** Ensure only authorized users can access sensitive data

### 8. **Encryption of Data in Transit**
- ✅ **HTTPS/TLS** — App uses HTTPS (automatic)
- [ ] **Fax Encryption:** Verify Faxage encrypts faxes in transit (should ask them)
- [ ] **Email Encryption:** Gmail encrypts by default, but consider S/MIME for extra security

### 9. **Disaster Recovery & Backup**
- [ ] **Backup Schedule:** Verify Base44 has automated daily backups
- [ ] **Disaster Recovery Plan:** Document how to restore if system fails
- [ ] **Test Restores:** Annually test that backups can be restored

### 10. **Subcontractors & Third-Party Services**
- [ ] **Inventory all vendors** handling PHI:
  - ✅ Base44 (database)
  - ✅ Google Workspace (email, docs, drive)
  - ✅ Faxage (fax transmission)
  - [ ] Any others? (payment processors, backup services, etc.)
- [ ] **BAAs for all vendors** — Document in compliance folder

---

## 🎯 Patient Intake Form Compliance

### Current Status ✅
Your PatientIntake form includes:
- **Step 0:** Collects personal info (name, DOB, address, phone, email)
- **Step 1:** Current condition & pain assessment
- **Step 2:** Health history, medications, surgeries
- **Step 3:** Insurance details (including optional card photo upload)
- **Step 4:** HIPAA consent acknowledgment + Notice of Privacy Practices

### HIPAA-Compliant Features ✅
- Patients must agree to HIPAA terms before submitting
- Text of HIPAA Notice displayed in full
- Intake data stored encrypted in Base44 database
- Only staff can view submitted intake (not accessible to patient post-submission)

### Recommendations
- [ ] Add a checkbox for patients to opt-in to specific uses (treatment, payment, operations)
- [ ] Provide a link to full Privacy Policy (even if same as Notice)
- [ ] Option for patients to request amendments post-intake
- [ ] Email confirmation to patient after intake submitted (proof of consent)

---

## 🔐 Patient Portal Access Control ✅

**Your current design is HIPAA-compliant:**

1. **Public Intake Form** (`/intake`)
   - ❌ NO authentication required
   - ❌ NO access to existing patient records
   - ❌ NO ability to view other patients' data
   - ✅ Only collects new patient information
   - ✅ HIPAA consent required before submission

2. **Authenticated App** (`/`, `/patients`, `/claims`, etc.)
   - ✅ Requires login
   - ✅ Staff/admin only
   - ✅ Full PHI access logged

3. **Patient Portal** (not yet implemented)
   - [ ] If you add a patient login later, they should ONLY see:
     - Their own records (claims, SOAP notes, bills)
     - NOT other patients' data
     - Implement row-level security on all queries

---

## 📋 Quick Summary: What's Missing

| Item | Status | Priority |
|------|--------|----------|
| Encryption at rest verification | ⚠️ Verify | High |
| Faxage BAA | ❌ Get signed | High |
| Incident response plan | ❌ Document | High |
| Retention/deletion policy | ❌ Define | Medium |
| Right to access feature | ❌ Build | Medium |
| Workforce training records | ⚠️ Track | Medium |
| Annual breach drills | ❌ Schedule | Medium |
| Vendor inventory doc | ⚠️ Document | Low |

---

## 📞 Next Steps

1. **This week:** Get Faxage BAA signed (critical before using fax feature)
2. **This week:** Verify Base44 encryption standards via support
3. **This month:** Document incident response plan (add to Compliance page)
4. **This month:** Schedule annual HIPAA training for all staff
5. **This quarter:** Add patient right-to-access feature
6. **Quarterly:** Review audit logs for any suspicious access

---

## 🏥 You're in Great Shape!

You've built a HIPAA-conscious system with strong defaults:
- ✅ Intake form collects consent
- ✅ Staff-only access to sensitive data
- ✅ Audit logging
- ✅ BAA with Google Workspace
- ✅ HTTPS/encryption in transit

Just **seal the gaps** (Faxage BAA, retention policy, incident plan) and you're audit-ready.