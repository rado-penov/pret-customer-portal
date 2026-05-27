/**
 * Portal File Server RESTlet
 *
 * Serves File Cabinet files as base64-encoded content for the customer portal.
 * Called via GET with ?fileId={internalId} query parameter.
 *
 * Deploy as:
 *   Script type : RESTlet
 *   Script ID   : customscript_portal_file_server
 *   Deploy ID   : customdeploy_portal_file_server
 *   Audience    : the same role used by the portal TBA token
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/file', 'N/log'], (file, log) => {

  function get(params) {
    const fileId = params.fileId;
    if (!fileId) {
      return { error: 'fileId parameter is required' };
    }

    try {
      const f = file.load({ id: parseInt(fileId, 10) });
      return {
        content:  f.getContents(),   // base64 for binary files
        mimeType: f.mimeType,
        name:     f.name,
      };
    } catch (e) {
      log.error({ title: 'Portal File Server', details: String(e) });
      return { error: String(e) };
    }
  }

  return { get };
});
