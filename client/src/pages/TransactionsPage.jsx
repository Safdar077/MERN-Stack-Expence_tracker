import React, { useState, useMemo, useCallback } from 'react';
import { FaPlus, FaExchangeAlt } from 'react-icons/fa';
import { useAuth } from '../hooks/useAuth.js';
import { useAccounts } from '../hooks/useAccounts.js';
import { useCategories } from '../hooks/useCategories.js';
import { useTransactions } from '../hooks/useTransactions.js';
import FilterBar from '../components/transactions/FilterBar.jsx';
import TransactionTable from '../components/transactions/TransactionTable.jsx';
import TransactionModal from '../components/transactions/TransactionModal.jsx';
import DeleteConfirmModal from '../components/transactions/DeleteConfirmModal.jsx';
import Alert from '../components/common/Alert.jsx';

/**
 * TransactionsPage Component
 *
 * Full-scale financial transaction history view providing:
 * 1. Combinable Multi-Criteria Filters: Real-time keyword search, transaction type, category,
 *    source account, calendar date range, and minimum/maximum amount thresholds.
 * 2. Backend Pagination: Server-delegated data fetching without loading the entire collection client-side.
 * 3. CSV Exporting: One-click export download matching current active query parameters.
 * 4. Modal CRUD Operations:
 *    - Add new transaction modal (via `TransactionModal`)
 *    - Edit existing transaction modal (via `TransactionModal`)
 *    - Delete confirmation dialogue (via `DeleteConfirmModal`)
 * 5. EventBus Reactive Sync: Automatically refreshes transaction history when transactions
 *    are created, updated, or removed across the application.
 *
 * Strict Architectural Compliance:
 * - NO Redux, NO Context API — pure React custom hooks.
 * - Uses react-icons exclusively.
 * - Thorough beginner-friendly inline commentary.
 */
const TransactionsPage = () => {
  // ---------------------------------------------------------------------------
  // 1. DATA HOOK INTEGRATION
  // ---------------------------------------------------------------------------
  const { user } = useAuth();
  const currency = user?.currency || 'USD';

  // Accounts and categories hook integrations
  const { accounts } = useAccounts();
  const { categories } = useCategories();

  // ---------------------------------------------------------------------------
  // 2. FILTER & PAGINATION STATE
  // ---------------------------------------------------------------------------
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const [filters, setFilters] = useState({
    search: '',
    type: '',
    categoryId: '',
    accountId: '',
    startDate: '',
    endDate: '',
    minAmount: '',
    maxAmount: '',
  });

  // Compile active query parameters for backend execution
  const queryParams = useMemo(() => {
    const params = { page, limit };

    if (filters.search && filters.search.trim()) {
      params.search = filters.search.trim();
    }
    if (filters.type) {
      params.type = filters.type;
    }
    if (filters.categoryId) {
      params.categoryId = filters.categoryId;
      params.category = filters.categoryId;
    }
    if (filters.accountId) {
      params.accountId = filters.accountId;
      params.account = filters.accountId;
    }
    if (filters.startDate) {
      params.startDate = filters.startDate;
    }
    if (filters.endDate) {
      params.endDate = filters.endDate;
    }
    if (filters.minAmount !== '' && filters.minAmount !== undefined) {
      params.minAmount = filters.minAmount;
    }
    if (filters.maxAmount !== '' && filters.maxAmount !== undefined) {
      params.maxAmount = filters.maxAmount;
    }

    return params;
  }, [page, limit, filters]);

  // Connect to custom transaction hook (automatically triggers fetch on queryParams change)
  const {
    transactions,
    totalCount,
    totalPages,
    loading: txLoading,
    error: txError,
    fetchTransactions,
    deleteTransaction,
    exportCSV,
  } = useTransactions(queryParams);

  // ---------------------------------------------------------------------------
  // 3. MODAL & ACTION STATES
  // ---------------------------------------------------------------------------
  // Transaction Create/Edit Modal state
  const [isTxModalOpen, setIsTxModalOpen] = useState(false);
  const [selectedTxForEdit, setSelectedTxForEdit] = useState(null);

  // Delete Confirmation Modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [txPendingDelete, setTxPendingDelete] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState(null);

  // CSV Export state
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState(null);

  // ---------------------------------------------------------------------------
  // 4. HANDLERS
  // ---------------------------------------------------------------------------

  /**
   * Updates a single filter field and resets the page view back to page 1.
   *
   * @param {string} key - Filter property name
   * @param {string|number} value - New filter value
   */
  const handleFilterChange = useCallback((key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
    }));
    setPage(1);
  }, []);

  /**
   * Resets all search and filter fields back to default empty state.
   */
  const handleResetFilters = useCallback(() => {
    setFilters({
      search: '',
      type: '',
      categoryId: '',
      accountId: '',
      startDate: '',
      endDate: '',
      minAmount: '',
      maxAmount: '',
    });
    setPage(1);
  }, []);

  /**
   * Adjusts page size (items per page limit) and resets page back to 1.
   *
   * @param {number} newLimit - New limit value (10, 20, 50)
   */
  const handleLimitChange = useCallback((newLimit) => {
    setLimit(newLimit);
    setPage(1);
  }, []);

  /**
   * Opens the TransactionModal in "Add" mode.
   */
  const handleOpenAddModal = useCallback(() => {
    setSelectedTxForEdit(null);
    setIsTxModalOpen(true);
  }, []);

  /**
   * Opens the TransactionModal in "Edit" mode pre-populated with active record data.
   *
   * @param {Object} tx - Transaction to edit
   */
  const handleOpenEditModal = useCallback((tx) => {
    setSelectedTxForEdit(tx);
    setIsTxModalOpen(true);
  }, []);

  /**
   * Closes the TransactionModal dialogue.
   */
  const handleCloseTxModal = useCallback(() => {
    setIsTxModalOpen(false);
    setSelectedTxForEdit(null);
  }, []);

  /**
   * Invoked after transaction is successfully saved via TransactionModal.
   */
  const handleTxModalSuccess = useCallback(() => {
    handleCloseTxModal();
    fetchTransactions();
  }, [fetchTransactions, handleCloseTxModal]);

  /**
   * Opens the Delete Confirmation Modal for the selected transaction.
   *
   * @param {Object} tx - Transaction to delete
   */
  const handleOpenDeleteModal = useCallback((tx) => {
    setTxPendingDelete(tx);
    setDeleteError(null);
    setIsDeleteModalOpen(true);
  }, []);

  /**
   * Closes the Delete Confirmation Modal.
   */
  const handleCloseDeleteModal = useCallback(() => {
    if (!deleteLoading) {
      setIsDeleteModalOpen(false);
      setTxPendingDelete(null);
      setDeleteError(null);
    }
  }, [deleteLoading]);

  /**
   * Executes transaction deletion through `deleteTransaction` hook method.
   */
  const handleConfirmDelete = useCallback(async () => {
    if (!txPendingDelete?._id) return;

    setDeleteLoading(true);
    setDeleteError(null);

    try {
      const result = await deleteTransaction(txPendingDelete._id);
      if (result?.success) {
        setIsDeleteModalOpen(false);
        setTxPendingDelete(null);
      } else {
        setDeleteError(result?.error || 'Failed to delete transaction.');
      }
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete transaction.');
    } finally {
      setDeleteLoading(false);
    }
  }, [deleteTransaction, txPendingDelete]);

  /**
   * Triggers CSV export matching the currently active filter conditions.
   */
  const handleExportCSV = useCallback(async () => {
    setIsExporting(true);
    setExportError(null);

    try {
      const result = await exportCSV(queryParams);
      if (!result?.success && result?.error) {
        setExportError(result.error);
      }
    } catch (err) {
      setExportError(err.message || 'CSV export failed.');
    } finally {
      setIsExporting(false);
    }
  }, [exportCSV, queryParams]);

  return (
    <div data-testid="transactions-page" className="space-y-6">
      {/* --------------------------------------------------------------------- */}
      {/* 1. HEADER SECTION                                                     */}
      {/* --------------------------------------------------------------------- */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center flex-shrink-0">
            <FaExchangeAlt className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-slate-800">Transactions</h1>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                {totalCount} total
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Filter, search, audit, and export your logged incomes and expenses.
            </p>
          </div>
        </div>

        {/* Primary CTA: Add Transaction */}
        <button
          type="button"
          onClick={handleOpenAddModal}
          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-xl shadow-sm hover:shadow transition-all"
        >
          <FaPlus className="w-3.5 h-3.5" aria-hidden="true" />
          <span>Add Transaction</span>
        </button>
      </div>

      {/* --------------------------------------------------------------------- */}
      {/* 2. ERROR NOTIFICATIONS (IF ANY)                                       */}
      {/* --------------------------------------------------------------------- */}
      {txError && (
        <Alert
          type="error"
          message={txError}
          onClose={() => fetchTransactions()}
        />
      )}

      {exportError && (
        <Alert
          type="error"
          message={exportError}
          onClose={() => setExportError(null)}
        />
      )}

      {deleteError && (
        <Alert
          type="error"
          message={deleteError}
          onClose={() => setDeleteError(null)}
        />
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 3. COMBINABLE FILTER CONTROLS                                         */}
      {/* --------------------------------------------------------------------- */}
      <FilterBar
        filters={filters}
        onFilterChange={handleFilterChange}
        onReset={handleResetFilters}
        onExport={handleExportCSV}
        isExporting={isExporting}
        categories={categories}
        accounts={accounts}
      />

      {/* --------------------------------------------------------------------- */}
      {/* 4. PAGINATED TRANSACTIONS TABLE                                       */}
      {/* --------------------------------------------------------------------- */}
      <TransactionTable
        transactions={transactions}
        loading={txLoading}
        totalCount={totalCount}
        page={page}
        totalPages={totalPages}
        limit={limit}
        currency={currency}
        onPageChange={setPage}
        onLimitChange={handleLimitChange}
        onEdit={handleOpenEditModal}
        onDelete={handleOpenDeleteModal}
        onResetFilters={handleResetFilters}
      />

      {/* --------------------------------------------------------------------- */}
      {/* 5. ADD / EDIT TRANSACTION MODAL                                       */}
      {/* --------------------------------------------------------------------- */}
      <TransactionModal
        isOpen={isTxModalOpen}
        onClose={handleCloseTxModal}
        initialData={selectedTxForEdit}
        onSuccess={handleTxModalSuccess}
      />

      {/* --------------------------------------------------------------------- */}
      {/* 6. DELETE CONFIRMATION MODAL                                          */}
      {/* --------------------------------------------------------------------- */}
      <DeleteConfirmModal
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirm={handleConfirmDelete}
        transaction={txPendingDelete}
        loading={deleteLoading}
        currency={currency}
      />
    </div>
  );
};

export default TransactionsPage;
