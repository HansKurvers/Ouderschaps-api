# Mollie Subscription Implementation - Summary

## Overview

Complete implementation of Mollie subscription system for Ouderschapsdesk with:
- €19.99/month subscription with 7-day free trial
- Mollie payment integration
- Database schema for subscriptions and payments
- Backend Azure Functions API
- Frontend subscription management UI
- Route protection requiring active subscription

## Implementation Status

✅ **FASE 1: Database Schema** - COMPLETED
✅ **FASE 2: Backend Services & API** - COMPLETED
✅ **FASE 3: Frontend UI & Integration** - COMPLETED

## Database Migration

### Migration File
`/home/hansk/Ouderschaps-api/migrations/001-subscription-tables.sql`

### Tables Created
1. **dbo.abonnementen** - Subscription records
   - Links to gebruikers table
   - Stores Mollie customer and subscription IDs
   - Tracks trial period and payment status

2. **dbo.betalingen** - Payment history
   - Links to abonnementen table
   - Stores Mollie payment IDs
   - Tracks payment status and dates

3. **dbo.gebruikers** - Extended with subscription fields
   - Added mollie_customer_id (NVARCHAR(50))
   - Added actief_abonnement (BIT, default 0)

### Execute Migration

**Using sqlcmd:**
```bash
sqlcmd -S sql-ouderschapsplan-server.database.windows.net \
  -d db-ouderschapsplan \
  -U sqladmin \
  -P "jrWDaVQe9S7s2cv" \
  -i migrations/001-subscription-tables.sql
```

**Using Azure Data Studio or SSMS:**
1. Connect to: `sql-ouderschapsplan-server.database.windows.net`
2. Database: `db-ouderschapsplan`
3. Open: `migrations/001-subscription-tables.sql`
4. Execute script

**Verification Query:**
```sql
SELECT TABLE_NAME
FROM INFORMATION_SCHEMA.TABLES
WHERE TABLE_NAME IN ('abonnementen', 'betalingen');

SELECT COLUMN_NAME
FROM INFORMATION_SCHEMA.COLUMNS
WHERE TABLE_NAME = 'gebruikers'
  AND COLUMN_NAME IN ('mollie_customer_id', 'actief_abonnement');
```

## Backend Deployment

### New Dependencies
Package `@mollie/api-client` has been added to package.json.

**Install on deployment:**
```bash
cd /home/hansk/Ouderschaps-api
npm install
```

### New Files Created

**Services:**
- `src/services/mollie.service.ts` - Mollie API client wrapper
- `src/services/subscription.service.ts` - Database operations for subscriptions

**Azure Functions (Endpoints):**
- `src/functions/subscription/create.ts` - POST /api/subscription/create
- `src/functions/subscription/webhook.ts` - POST /api/subscription/webhook
- `src/functions/subscription/cancel.ts` - POST /api/subscription/cancel
- `src/functions/subscription/status.ts` - GET /api/subscription/status

**Configuration:**
- `src/index.ts` - Updated with subscription function imports

### Environment Variables

**Required in Azure Function App Configuration:**

```bash
# Mollie API Configuration
MOLLIE_API_KEY=live_xxxxxxxxxxxxxxxxxxxxx  # Replace with LIVE key for production
REDIRECT_URL=https://app.scheidingsdesk.nl/subscription/return
WEBHOOK_URL=https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/webhook

# Database Configuration (already configured)
DB_SERVER=sql-ouderschapsplan-server.database.windows.net
DB_DATABASE=db-ouderschapsplan
DB_USER=sqladmin
DB_PASSWORD=jrWDaVQe9S7s2cv

# Auth0 Configuration (already configured)
AUTH0_DOMAIN=dev-cqdk8rl0mh4xtez.eu.auth0.com
AUTH0_AUDIENCE=https://api.scheidingsdesk.nl
```

**Update via Azure CLI:**
```bash
az functionapp config appsettings set \
  --name ouderschaps-api-fvgbfwachxabawgs \
  --resource-group rg-ouderschapsplan \
  --settings \
    MOLLIE_API_KEY="live_xxxxxxxxxxxxxxxxxxxxx" \
    REDIRECT_URL="https://app.scheidingsdesk.nl/subscription/return" \
    WEBHOOK_URL="https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/webhook"
```

**Or via Azure Portal:**
1. Navigate to Function App: `ouderschaps-api-fvgbfwachxabawgs`
2. Settings → Environment variables → App settings
3. Add new application settings with values above

### Deployment Steps

**Option 1: GitHub Actions (Recommended)**
```bash
cd /home/hansk/Ouderschaps-api
git add .
git commit -m "feat: implement Mollie subscription system with 7-day trial"
git push origin main
```
GitHub Actions will automatically build and deploy.

**Option 2: Azure Functions Core Tools**
```bash
cd /home/hansk/Ouderschaps-api
npm run build
func azure functionapp publish ouderschaps-api-fvgbfwachxabawgs
```

**Option 3: VS Code Azure Functions Extension**
1. Open project in VS Code
2. Azure extension → Functions
3. Right-click Function App → Deploy to Function App

### Mollie Webhook Configuration

After backend deployment, configure Mollie webhook:

1. Log in to Mollie Dashboard: https://www.mollie.com/dashboard
2. Navigate to: Developers → Webhooks
3. Add webhook URL: `https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/webhook`
4. Save configuration

## Frontend Deployment

### New Files Created

**Services:**
- `src/services/subscription.service.ts` - API client for subscription endpoints

**Pages:**
- `src/pages/SubscriptionPage.tsx` - Subscription management UI
- `src/pages/SubscriptionReturnPage.tsx` - Return page after Mollie checkout

**Components:**
- `src/components/SubscriptionGuard.tsx` - Route protection component

**Updated Files:**
- `src/contexts/AuthContext.tsx` - Added subscription status management
- `src/router.tsx` - Added subscription routes and guards
- `src/components/Navigation.tsx` - Added Abonnement link

### Configuration Files

**`public/staticwebapp.config.json`**
- Updated with CSP headers to allow API connections
- Already in place and verified working

**`.env.production`**
- API URL already configured correctly
- No changes needed

### Deployment Steps

**Option 1: GitHub Actions (Recommended)**
```bash
cd /home/hansk/Ouderschaps-web
git add .
git commit -m "feat: implement Mollie subscription UI with payment flow and route guards"
git push origin main
```
GitHub Actions will automatically build and deploy to Azure Static Web Apps.

**Option 2: Azure Static Web Apps CLI**
```bash
cd /home/hansk/Ouderschaps-web
npm run build
swa deploy --app-name agreeable-grass-0622e6803
```

### Verification After Deployment

**Frontend Routes:**
- https://app.scheidingsdesk.nl/subscription - Subscription management page
- https://app.scheidingsdesk.nl/subscription/return - Return page after payment

**Protected Routes (require active subscription):**
- https://app.scheidingsdesk.nl/dossiers
- https://app.scheidingsdesk.nl/contacten

## API Endpoints

### POST /api/subscription/create
Create new subscription and redirect to Mollie checkout.

**Authentication:** Required (JWT)

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "checkoutUrl": "https://www.mollie.com/checkout/...",
    "subscriptionId": 1,
    "paymentId": "tr_xxxxx",
    "customer": {
      "id": "cst_xxxxx",
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

### GET /api/subscription/status
Get current subscription status and payment history.

**Authentication:** Required (JWT)

**Response:**
```json
{
  "success": true,
  "data": {
    "hasActiveSubscription": true,
    "subscription": {
      "id": 1,
      "planType": "basis",
      "status": "active",
      "startDatum": "2025-01-01T00:00:00Z",
      "eindDatum": null,
      "trialEindDatum": "2025-01-08T00:00:00Z",
      "inTrialPeriod": true,
      "maandelijksBedrag": 19.99,
      "volgendeBetaling": "2025-01-08T00:00:00Z"
    },
    "recentPayments": [
      {
        "id": 1,
        "bedrag": 19.99,
        "status": "paid",
        "betaalDatum": "2025-01-01T12:00:00Z",
        "aangemaaktOp": "2025-01-01T11:55:00Z"
      }
    ],
    "nextPaymentDate": "2025-01-08T00:00:00Z"
  }
}
```

### POST /api/subscription/cancel
Cancel active subscription.

**Authentication:** Required (JWT)

**Request:**
```json
{}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "message": "Abonnement succesvol opgezegd"
  }
}
```

### POST /api/subscription/webhook
Mollie webhook for payment status updates (called by Mollie, not frontend).

**Authentication:** None (validated via Mollie payment ID)

**Request Body:** Mollie webhook format
```
id=tr_xxxxx
```

**Processing:**
1. Validates payment ID
2. Fetches payment from Mollie API
3. Updates payment status in database
4. If payment.paid → creates recurring subscription
5. Activates user subscription

## User Flow

### New User Subscription Flow

1. **User logs in** → Redirected to /subscription (no active subscription)
2. **Clicks "Start Gratis Proefperiode"** → POST /api/subscription/create
3. **Backend creates:**
   - Mollie customer
   - First payment (€19.99 with 7-day mandate)
   - Database subscription record (status: pending)
4. **User redirected to Mollie** → Completes payment
5. **Mollie calls webhook** → POST /api/subscription/webhook
6. **Backend processes webhook:**
   - Updates payment status to 'paid'
   - Creates recurring Mollie subscription
   - Activates user subscription in database
   - Sets trial end date to +7 days
7. **User returns** → /subscription/return
8. **Frontend refreshes status** → Shows success message
9. **User can access protected routes** → /dossiers, /contacten

### Existing User Flow

1. **User logs in with active subscription** → Can access all routes
2. **Views subscription page** → See subscription details, payment history
3. **Trial period active** → Blue alert showing trial end date
4. **After trial** → Automatic monthly payments via Mollie

### Cancellation Flow

1. **User clicks "Opzeggen"** → Confirmation dialog
2. **Confirms** → POST /api/subscription/cancel
3. **Backend cancels Mollie subscription** → Updates database
4. **User can continue until end date** → Subscription remains active until current period ends
5. **After end date** → Redirected to /subscription for renewal

## Testing Checklist

### Database Testing
- [ ] Execute migration script successfully
- [ ] Verify tables created: `abonnementen`, `betalingen`
- [ ] Verify gebruikers columns added: `mollie_customer_id`, `actief_abonnement`
- [ ] Test foreign key constraints
- [ ] Verify default values

### Backend Testing
- [ ] Deploy backend to Azure
- [ ] Configure Mollie API key (test mode first)
- [ ] Test POST /api/subscription/create with authenticated user
- [ ] Verify Mollie customer created
- [ ] Verify database subscription record created
- [ ] Test Mollie checkout URL redirect
- [ ] Configure Mollie webhook in dashboard
- [ ] Test webhook by completing test payment
- [ ] Verify webhook creates recurring subscription
- [ ] Verify database updates correctly
- [ ] Test GET /api/subscription/status
- [ ] Test POST /api/subscription/cancel
- [ ] Test error handling for missing auth
- [ ] Test error handling for Mollie API failures

### Frontend Testing
- [ ] Deploy frontend to Azure Static Web Apps
- [ ] Test /subscription page loads
- [ ] Test "Start Gratis Proefperiode" button
- [ ] Test redirect to Mollie
- [ ] Complete test payment in Mollie
- [ ] Test /subscription/return page
- [ ] Verify success message displays
- [ ] Verify subscription status updates
- [ ] Test protected routes are accessible after subscription
- [ ] Test SubscriptionGuard redirects without subscription
- [ ] Test subscription details display correctly
- [ ] Test payment history table
- [ ] Test "Opzeggen" button
- [ ] Test cancellation confirmation
- [ ] Verify navigation "Abonnement" link works

### End-to-End Testing
- [ ] Complete full flow: login → subscribe → pay → access dossiers
- [ ] Test trial period calculation
- [ ] Wait for trial to end (or manipulate dates) → verify first payment
- [ ] Test monthly recurring payments
- [ ] Test cancellation and access after cancellation
- [ ] Test reactivation after cancellation
- [ ] Test multiple users simultaneously

### Production Readiness
- [ ] Switch Mollie API key from test to live
- [ ] Configure production webhook URL
- [ ] Test with real payment method
- [ ] Monitor webhook logs in Azure
- [ ] Set up alerts for payment failures
- [ ] Document support procedures for subscription issues

## Security Considerations

### Implemented Security Measures

1. **Authentication:**
   - All subscription endpoints require Auth0 JWT token
   - User ID extracted from validated token

2. **User Data Isolation:**
   - All database queries scoped to authenticated user ID
   - Users can only access their own subscriptions

3. **SQL Injection Prevention:**
   - All queries use parameterized statements
   - No string concatenation in SQL

4. **Webhook Validation:**
   - Webhook validates payment ID exists in Mollie
   - Payment metadata verified before processing

5. **HTTPS Only:**
   - All endpoints use HTTPS
   - Mollie redirects and webhooks use HTTPS

6. **Content Security Policy:**
   - CSP headers configured in staticwebapp.config.json
   - Restricts allowed domains for API calls

### Recommended Additional Measures

1. **Rate Limiting:**
   - Consider implementing rate limits on subscription endpoints
   - Prevent abuse of trial subscriptions

2. **Email Verification:**
   - Ensure Auth0 requires verified emails
   - Prevents multiple trial subscriptions with fake emails

3. **Monitoring:**
   - Set up Azure Application Insights alerts
   - Monitor for failed payments, webhook errors
   - Track subscription cancellation rates

4. **Backup:**
   - Regular database backups
   - Test restore procedures

## Known Limitations

1. **Single Plan Type:**
   - Currently only supports "basis" plan at €19.99/month
   - Database schema supports multiple plan types for future expansion

2. **Trial Period:**
   - Fixed 7-day trial period
   - Not configurable without code changes

3. **Payment Methods:**
   - Supports all Mollie payment methods
   - Recurring payments require SEPA Direct Debit or credit card

4. **Cancellation:**
   - User can cancel but subscription remains active until period end
   - No immediate access revocation

5. **Webhooks:**
   - Relies on Mollie webhooks for payment processing
   - Webhook failures could delay subscription activation
   - No automatic retry mechanism implemented

## Future Enhancements

1. **Multiple Plan Tiers:**
   - Add premium plan with additional features
   - Implement plan upgrade/downgrade logic

2. **Annual Billing:**
   - Add yearly subscription option with discount
   - Update payment flow for annual payments

3. **Invoicing:**
   - Generate PDF invoices for payments
   - Email invoices to users automatically

4. **Usage Tracking:**
   - Track dossiers created per user
   - Add usage limits per plan tier

5. **Admin Dashboard:**
   - Create admin interface for subscription management
   - Monitor active subscriptions, revenue, churn

6. **Failed Payment Recovery:**
   - Email notifications for failed payments
   - Automatic retry logic
   - Grace period before suspension

7. **Referral Program:**
   - Give free month for referrals
   - Track referral sources

## Support & Troubleshooting

### Common Issues

**Issue: User sees "failed to fetch" errors**
- **Solution:** Verify CSP headers in staticwebapp.config.json include API domain
- **Verification:** Check browser console for CSP violations

**Issue: Webhook not processing payments**
- **Solution:** Verify webhook URL configured in Mollie dashboard
- **Check:** Azure Function logs for webhook errors
- **URL:** https://ouderschaps-api-fvgbfwachxabawgs.westeurope-01.azurewebsites.net/api/subscription/webhook

**Issue: User stuck in "pending" status after payment**
- **Solution:** Check webhook was called successfully
- **Manual fix:** Query payment status from Mollie, update database manually
- **Prevention:** Implement webhook retry mechanism

**Issue: Subscription not activated after trial**
- **Solution:** Check Mollie subscription was created during webhook processing
- **Verification:** Check Mollie dashboard for recurring subscription
- **Fix:** Create recurring subscription manually if needed

### Database Queries for Support

**Check user subscription status:**
```sql
SELECT u.id, u.email, u.actief_abonnement,
       a.status, a.trial_eind_datum, a.mollie_subscription_id
FROM dbo.gebruikers u
LEFT JOIN dbo.abonnementen a ON u.id = a.gebruiker_id
WHERE u.email = 'user@example.com';
```

**Check payment history:**
```sql
SELECT b.*, a.gebruiker_id
FROM dbo.betalingen b
JOIN dbo.abonnementen a ON b.abonnement_id = a.id
WHERE a.gebruiker_id = 1
ORDER BY b.aangemaakt_op DESC;
```

**Manually activate subscription (emergency use only):**
```sql
UPDATE dbo.gebruikers
SET actief_abonnement = 1
WHERE id = 1;

UPDATE dbo.abonnementen
SET status = 'active',
    start_datum = GETDATE(),
    trial_eind_datum = DATEADD(day, 7, GETDATE())
WHERE gebruiker_id = 1;
```

## Rollback Procedures

If issues arise after deployment:

**Backend Rollback:**
1. Navigate to Azure Function App in portal
2. Deployment Center → Deployment History
3. Select previous successful deployment
4. Click "Redeploy"

**Frontend Rollback:**
1. Navigate to Azure Static Web App in portal
2. Deployment History
3. Select previous deployment
4. Click "Activate"

**Database Rollback:**
```sql
-- Drop new tables
DROP TABLE IF EXISTS dbo.betalingen;
DROP TABLE IF EXISTS dbo.abonnementen;

-- Remove columns from gebruikers
ALTER TABLE dbo.gebruikers
DROP COLUMN mollie_customer_id, actief_abonnement;
```

**Important:** Database rollback will delete all subscription and payment data!

## Contact & Resources

**Mollie Resources:**
- Dashboard: https://www.mollie.com/dashboard
- API Documentation: https://docs.mollie.com/
- Support: support@mollie.com

**Azure Resources:**
- Function App: ouderschaps-api-fvgbfwachxabawgs
- Static Web App: agreeable-grass-0622e6803
- SQL Server: sql-ouderschapsplan-server.database.windows.net
- Database: db-ouderschapsplan

**Project Documentation:**
- API Endpoints: `/home/hansk/Ouderschaps-api/API_ENDPOINTS.md`
- Database Schema: `/home/hansk/Ouderschaps-api/database-schema.md`
- Development Guide: `/home/hansk/Ouderschaps-api/DEVELOPMENT.md`

---

**Implementation Date:** 2025-11-14
**Implemented By:** Claude Code Assistant
**Version:** 1.0.0
