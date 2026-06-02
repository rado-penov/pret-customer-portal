/**
 * Portal File Server RESTlet
 *
 * Two modes (selected by query parameter):
 *   ?transactionId={internalId}  — render a transaction (invoice, credit memo, …)
 *                                  as PDF using N/render and return base64 content.
 *   ?fileId={internalId}         — serve a File Cabinet file as base64 content.
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
define(['N/file', 'N/render', 'N/search', 'N/log'], (file, render, search, log) => {

  function get(params) {
    if (params.transactionId) {
      return renderTransactionPdf(params.transactionId);
    }
    if (params.fileId) {
      return serveFile(params.fileId);
    }
    return { error: 'fileId or transactionId parameter is required' };
  }

  // ─── Render a transaction record as PDF via N/render ─────────────────────────

  function renderTransactionPdf(transactionId) {
    const id = Number(transactionId);
    if (isNaN(id)) {
      return { error: 'Invalid transactionId: ' + transactionId };
    }

    try {
      const pdfFile = render.transaction({
        entityId: id,
        printMode: render.PrintMode.PDF,
        inCustLocale: false,
      });

      log.debug({
        title: 'Transaction PDF rendered',
        details: JSON.stringify({ transactionId, name: pdfFile.name }),
      });

      return {
        content:  pdfFile.getContents(), // base64-encoded PDF bytes
        mimeType: 'application/pdf',
        name:     pdfFile.name || (transactionId + '.pdf'),
      };
    } catch (err) {
      log.error({ title: 'render.transaction failed', details: String(err) });
      return { error: 'render.transaction failed: ' + String(err), transactionId };
    }
  }

  // ─── Serve a File Cabinet file ────────────────────────────────────────────────

  function serveFile(fileId) {
    const id = Number(fileId);
    if (isNaN(id)) {
      return { error: 'Invalid fileId: ' + fileId };
    }

    let f;
    try {
      f = file.load({ id });
    } catch (loadErr) {
      log.error({ title: 'file.load failed', details: String(loadErr) });

      let meta = {};
      try {
        meta = search.lookupFields({
          type: search.Type.FILE,
          id,
          columns: ['name', 'filetype', 'filesize', 'url'],
        });
      } catch (searchErr) {
        log.error({ title: 'search.lookupFields failed', details: String(searchErr) });
      }

      return { error: 'file.load failed: ' + String(loadErr), fileId, meta };
    }

    log.debug({
      title: 'File loaded',
      details: JSON.stringify({ name: f.name, fileType: f.fileType, mimeType: f.mimeType, size: f.size }),
    });

    try {
      return {
        content:  f.getContents(),
        mimeType: f.mimeType || 'application/pdf',
        name:     f.name,
      };
    } catch (contentsErr) {
      log.error({ title: 'getContents failed', details: String(contentsErr) });
      return {
        error:    'getContents failed: ' + String(contentsErr),
        fileId,
        fileName: f.name,
        fileType: f.fileType,
        mimeType: f.mimeType,
        fileSize: f.size,
      };
    }
  }

  return { get };
});
