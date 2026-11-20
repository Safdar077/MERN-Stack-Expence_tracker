/**
 * CSV Exporter Utility
 * 
 * Formats an array of transaction documents into RFC 4180 compliant CSV string.
 * Columns: Date,Type,Category,Account,Amount,Note
 */

/**
 * Escapes a field for CSV output:
 * - Null or undefined values become empty string
 * - Fields containing quotes, commas, or newlines are wrapped in double quotes
 * - Double quotes inside fields are escaped as ""
 * 
 * @param {any} value 
 * @returns {string}
 */
const escapeCSVField = (value) => {
  if (value === null || value === undefined) {
    return '';
  }
  const str = String(value);
  if (/[",\r\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
};

/**
 * Formats a transaction date into YYYY-MM-DD string
 * 
 * @param {Date|string} date 
 * @returns {string}
 */
const formatDate = (date) => {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return d.toISOString().split('T')[0];
};

/**
 * Converts transactions array into a formatted CSV string
 * 
 * @param {Array<Object>} transactions 
 * @returns {string}
 */
const exportTransactionsToCSV = (transactions = []) => {
  const headers = ['Date', 'Type', 'Category', 'Account', 'Amount', 'Note'];
  const headerLine = headers.join(',');

  const rows = transactions.map((tx) => {
    const date = formatDate(tx.date);
    const type = tx.type || '';
    const categoryName = tx.categoryId?.name || (typeof tx.categoryId === 'string' ? tx.categoryId : '');
    const accountName = tx.accountId?.name || (typeof tx.accountId === 'string' ? tx.accountId : '');
    const amount = tx.amount !== undefined ? tx.amount : '';
    const note = tx.note || '';

    return [
      escapeCSVField(date),
      escapeCSVField(type),
      escapeCSVField(categoryName),
      escapeCSVField(accountName),
      escapeCSVField(amount),
      escapeCSVField(note),
    ].join(',');
  });

  return [headerLine, ...rows].join('\r\n');
};

module.exports = {
  escapeCSVField,
  exportTransactionsToCSV,
};
