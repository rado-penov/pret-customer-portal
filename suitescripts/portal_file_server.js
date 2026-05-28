/**
 * Portal File Server RESTlet
 *
 * Serves File Cabinet files as base64-encoded content for the customer portal.
 * Called via GET with ?fileId={internalId} query parameter.
 *
 * Deploy as:
 *   Script type : RESTlet
 *   Script ID   : customscript_pret_portal_file_server
 *   Deploy ID   : customdeploy_pret_portal_file_server
 *   Audience    : the same role used by the portal TBA token
 *
 * @NApiVersion 2.1
 * @NScriptType Restlet
 * @NModuleScope Public
 */
define(['N/file', 'N/search', 'N/log'], (file, search, log) => {

  function get(params) {
    const fileId = params.fileId;
    if (!fileId) {
      return { error: 'fileId parameter is required' };
    }

    const id = Number(fileId);
    if (isNaN(id)) {
      return { error: 'Invalid fileId: ' + fileId };
    }

    // Step 1: try file.load() — may throw "Unsupported file extension" if the
    // file has no extension and N/file can't detect its type from the name.
    let f;
    try {
      f = file.load({ id: id });
    } catch (loadErr) {
      log.error({ title: 'file.load failed', details: String(loadErr) });

      // Return metadata from search so caller can diagnose the problem.
      let meta = {};
      try {
        meta = search.lookupFields({
          type: search.Type.FILE,
          id: id,
          columns: ['name', 'filetype', 'filesize', 'url'],
        });
      } catch (searchErr) {
        log.error({ title: 'search.lookupFields failed', details: String(searchErr) });
      }

      return {
        error: 'file.load failed: ' + String(loadErr),
        fileId: fileId,
        meta: meta,
      };
    }

    // Step 2: file loaded — log metadata and attempt to read content.
    log.debug({
      title: 'File loaded',
      details: JSON.stringify({ name: f.name, fileType: f.fileType, mimeType: f.mimeType, size: f.size }),
    });

    try {
      const content = f.getContents(); // base64 for binary files
      return {
        content:  content,
        mimeType: f.mimeType || 'application/pdf',
        name:     f.name,
      };
    } catch (contentsErr) {
      log.error({ title: 'getContents failed', details: String(contentsErr) });
      return {
        error:    'getContents failed: ' + String(contentsErr),
        fileId:   fileId,
        fileName: f.name,
        fileType: f.fileType,
        mimeType: f.mimeType,
        fileSize: f.size,
      };
    }
  }

  return { get };
});
