/**
 * Portal Contact Invite – User Event Script
 *
 * Fires on Contact afterSubmit. When custentity_pret_enable_customer_portal is
 * switched ON, calls the portal's /api/auth/invite endpoint so the contact
 * receives a "Set your password" link (printed to the portal console if SMTP
 * is not yet configured).
 *
 * Script Parameters (set on the Script record in NetSuite):
 *   custscript_portal_invite_url    – e.g. https://your-portal-domain.com
 *                                     NOTE: must be a public URL — localhost
 *                                     is not reachable from NetSuite servers.
 *                                     Use ngrok during local development.
 *   custscript_portal_invite_secret – must match PORTAL_INVITE_SECRET in .env.local
 *
 * Deploy on: Contact record | Event: After Submit | Status: Released
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/https', 'N/runtime', 'N/log'], function (https, runtime, log) {

  var ENABLE_FIELD = 'custentity_pret_enable_customer_portal';

  function afterSubmit(context) {
    try {
      // Ignore deletes
      if (context.type === 'delete') return;

      var newRec    = context.newRecord;
      var isEnabled = newRec.getValue({ fieldId: ENABLE_FIELD });

      // Only act when the flag is ON
      if (!isEnabled) return;

      // On edits, skip if the flag was already ON — avoids re-sending on every save
      if (context.type === 'edit') {
        var wasEnabled = context.oldRecord.getValue({ fieldId: ENABLE_FIELD });
        if (wasEnabled) return;
      }

      var email = newRec.getValue({ fieldId: 'email' });
      if (!email) {
        log.error({ title: 'Portal Invite', details: 'Contact has no email address — skipping invite.' });
        return;
      }

      var script      = runtime.getCurrentScript();
      var portalUrl   = script.getParameter({ name: 'custscript_portal_invite_url' });
      var inviteSecret = script.getParameter({ name: 'custscript_portal_invite_secret' });

      if (!portalUrl || !inviteSecret) {
        log.error({
          title:   'Portal Invite – missing parameters',
          details: 'Set custscript_portal_invite_url and custscript_portal_invite_secret on the Script Deployment record.'
        });
        return;
      }

      var response = https.post({
        url:     portalUrl + '/api/auth/invite',
        body:    JSON.stringify({ email: email, secret: inviteSecret }),
        headers: { 'Content-Type': 'application/json' }
      });

      if (response.code === 200) {
        log.audit({ title: 'Portal Invite', details: 'Invitation triggered for ' + email });
      } else {
        log.error({
          title:   'Portal Invite – unexpected response',
          details: 'HTTP ' + response.code + ': ' + response.body
        });
      }

    } catch (e) {
      log.error({
        title:   'Portal Invite – unhandled error',
        details: (e && e.message) ? e.message : String(e)
      });
    }
  }

  return { afterSubmit: afterSubmit };
});
