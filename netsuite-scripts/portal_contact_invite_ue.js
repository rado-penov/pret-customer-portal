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
 * View logs: NetSuite > Setup > Technical Support Center > Script Execution Logs
 * or Customisation > Scripting > Script Execution Logs
 *
 * @NApiVersion 2.1
 * @NScriptType UserEventScript
 */
define(['N/https', 'N/runtime', 'N/log'], function (https, runtime, log) {

  var ENABLE_FIELD = 'custentity_pret_enable_customer_portal';

  function afterSubmit(context) {
    log.debug({ title: '[1] afterSubmit fired', details: 'Event type: ' + context.type });

    try {
      // Ignore deletes
      if (context.type === 'delete') {
        log.debug({ title: '[2] Skipped', details: 'Event type is delete — nothing to do.' });
        return;
      }

      var newRec    = context.newRecord;
      var contactId = newRec.id;
      log.debug({ title: '[2] Record loaded', details: 'Contact ID: ' + contactId });

      var isEnabled = newRec.getValue({ fieldId: ENABLE_FIELD });
      log.debug({ title: '[3] Enable field read', details: ENABLE_FIELD + ' = ' + isEnabled });

      // Only act when the flag is ON
      if (!isEnabled) {
        log.debug({ title: '[3] Skipped', details: 'Enable field is false — no invite needed.' });
        return;
      }

      // On edits, skip if the flag was already ON — avoids re-sending on every save
      if (context.type === 'edit') {
        var wasEnabled = context.oldRecord.getValue({ fieldId: ENABLE_FIELD });
        log.debug({ title: '[4] Previous value checked', details: 'Was already enabled: ' + wasEnabled });
        if (wasEnabled) {
          log.debug({ title: '[4] Skipped', details: 'Flag was already ON before this save — not re-sending invite.' });
          return;
        }
      }

      var email = newRec.getValue({ fieldId: 'email' });
      log.debug({ title: '[5] Email read', details: 'Email: ' + (email || '(empty)') });

      if (!email) {
        log.error({ title: '[5] Error', details: 'Contact has no email address — cannot send invite.' });
        return;
      }

      var script       = runtime.getCurrentScript();
      var portalUrl    = script.getParameter({ name: 'custscript_pret_portal_url' });
      var inviteSecret = script.getParameter({ name: 'custscript_pret_portal_invite_secret' });

      log.debug({
        title:   '[6] Script parameters read',
        details: 'Portal URL: ' + (portalUrl || '(not set)') + ' | Secret set: ' + (inviteSecret ? 'YES' : 'NO')
      });

      if (!portalUrl) {
        log.error({ title: '[6] Error', details: 'custscript_pret_portal_url is not set on the deployment.' });
        return;
      }
      if (!inviteSecret) {
        log.error({ title: '[6] Error', details: 'custscript_pret_portal_invite_secret is not set on the deployment.' });
        return;
      }

      var requestUrl  = portalUrl + '/api/auth/invite';
      var requestBody = JSON.stringify({ email: email, secret: inviteSecret });

      log.debug({ title: '[7] Sending HTTP POST', details: 'URL: ' + requestUrl + ' | Body: ' + requestBody });

      var response = https.post({
        url:     requestUrl,
        body:    requestBody,
        headers: { 'Content-Type': 'application/json' }
      });

      log.debug({
        title:   '[8] HTTP response received',
        details: 'Status: ' + response.code + ' | Body: ' + response.body
      });

      if (response.code === 200) {
        log.audit({
          title:   '[8] Success',
          details: 'Invite triggered successfully for ' + email + ' (Contact ' + contactId + ')'
        });
      } else {
        log.error({
          title:   '[8] Error – unexpected HTTP status',
          details: 'Expected 200, got ' + response.code + '. Response body: ' + response.body
        });
      }

    } catch (e) {
      log.error({
        title:   '[ERROR] Unhandled exception',
        details: 'Message: ' + ((e && e.message) ? e.message : String(e)) +
                 ' | Stack: ' + ((e && e.stack) ? e.stack : 'n/a')
      });
    }
  }

  return { afterSubmit: afterSubmit };
});
