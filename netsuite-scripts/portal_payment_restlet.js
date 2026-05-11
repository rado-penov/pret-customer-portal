/**
 * NS Nexus Customer Portal – Payment RESTlet
 *
 * Deploy as: RESTlet, Script Type = RESTlet
 * Function mapping: post → post
 *
 * Receives:
 *   { customerId: string, amount: number, invoiceIds: string[], memo?: string }
 *
 * Returns:
 *   { paymentId: string, tranId: string, status: string, message: string }
 */

/**
 * @NApiVersion 2.1
 * @NScriptType Restlet
 */
define(['N/record', 'N/search', 'N/runtime', 'N/error'], (record, search, runtime, error) => {

  function post(body) {
    const { customerId, amount, invoiceIds, memo } = body;

    if (!customerId || !amount || !invoiceIds || invoiceIds.length === 0) {
      throw error.create({
        name: 'MISSING_PARAMS',
        message: 'customerId, amount, and invoiceIds are required.',
      });
    }

    // Load open invoices to calculate amounts to apply
    const invoiceLookup = {};
    invoiceIds.forEach((id) => {
      const fields = search.lookupFields({
        type: search.Type.INVOICE,
        id,
        columns: ['amountremaining', 'entity', 'currency'],
      });
      // Security: ensure the invoice belongs to this customer
      if (String(fields.entity[0]?.value) !== String(customerId)) {
        throw error.create({
          name: 'ACCESS_DENIED',
          message: `Invoice ${id} does not belong to the specified customer.`,
        });
      }
      invoiceLookup[id] = parseFloat(fields.amountremaining);
    });

    // Create Customer Payment record
    const payment = record.create({
      type: record.Type.CUSTOMER_PAYMENT,
      isDynamic: true,
    });

    payment.setValue({ fieldId: 'customer', value: parseInt(customerId, 10) });
    payment.setValue({ fieldId: 'payment', value: amount });
    if (memo) payment.setValue({ fieldId: 'memo', value: memo });

    // Apply to selected invoices (pro-rate if partial payment)
    const totalSelected = Object.values(invoiceLookup).reduce((s, v) => s + v, 0);
    let remaining = amount;

    const applyCount = payment.getLineCount({ sublistId: 'apply' });
    for (let i = 0; i < applyCount; i++) {
      const lineId = String(payment.getSublistValue({ sublistId: 'apply', fieldId: 'internalid', line: i }));
      if (invoiceLookup[lineId] !== undefined) {
        payment.selectLine({ sublistId: 'apply', line: i });
        payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'apply', value: true });

        // Apply proportional amount for partial payments
        const proportion  = invoiceLookup[lineId] / totalSelected;
        const applyAmount = Math.min(
          parseFloat((amount * proportion).toFixed(2)),
          remaining,
          invoiceLookup[lineId]
        );
        payment.setCurrentSublistValue({ sublistId: 'apply', fieldId: 'amount', value: applyAmount });
        remaining = parseFloat((remaining - applyAmount).toFixed(2));

        payment.commitLine({ sublistId: 'apply' });
      }
    }

    const paymentId = payment.save({ enableSourcing: true, ignoreMandatoryFields: false });

    const savedFields = search.lookupFields({
      type: record.Type.CUSTOMER_PAYMENT,
      id: paymentId,
      columns: ['tranid', 'status'],
    });

    return {
      paymentId: String(paymentId),
      tranId: savedFields.tranid,
      status: 'Pending',
      message: `Payment ${savedFields.tranid} created successfully and is pending processing.`,
    };
  }

  return { post };
});
