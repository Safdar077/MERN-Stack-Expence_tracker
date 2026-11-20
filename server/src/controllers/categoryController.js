/**
 * Category Controllers
 * 
 * Manages transaction categories including default global categories (Food, Rent, Salary, etc.)
 * and user-created custom categories.
 * 
 * Auto-Seeding & Isolation:
 * - On first request, if no default categories exist in the database (`userId: null`),
 *   the system automatically seeds 16 standard categories (10 Expense, 6 Income)
 *   with standard react-icons identifiers.
 * - Custom categories are stored with `userId: req.user._id` and `isCustom: true`.
 * - Querying categories retrieves `{ $or: [{ userId: null }, { userId: req.user._id }] }`,
 *   meaning User B will never see User A's custom categories.
 */

const Category = require('../models/Category');

/**
 * Standard System Default Categories
 * 
 * Default Expense Categories (10):
 * - Food (FaUtensils), Travel (FaCar), Shopping (FaShoppingBag), Bills (FaFileInvoiceDollar),
 *   Rent (FaHome), Entertainment (FaGamepad), Health (FaHeartbeat), Education (FaGraduationCap),
 *   Subscription (FaTv), Other (FaQuestionCircle).
 * 
 * Default Income Categories (6):
 * - Salary (FaMoneyBillWave), Freelance (FaLaptopCode), Business (FaBriefcase),
 *   Investment (FaChartLine), Gift (FaGift), Other (FaQuestionCircle).
 */
const DEFAULT_CATEGORIES = [
  // Default Expense Categories
  { name: 'Food', type: 'Expense', icon: 'FaUtensils', isCustom: false, userId: null },
  { name: 'Travel', type: 'Expense', icon: 'FaCar', isCustom: false, userId: null },
  { name: 'Shopping', type: 'Expense', icon: 'FaShoppingBag', isCustom: false, userId: null },
  { name: 'Bills', type: 'Expense', icon: 'FaFileInvoiceDollar', isCustom: false, userId: null },
  { name: 'Rent', type: 'Expense', icon: 'FaHome', isCustom: false, userId: null },
  { name: 'Entertainment', type: 'Expense', icon: 'FaGamepad', isCustom: false, userId: null },
  { name: 'Health', type: 'Expense', icon: 'FaHeartbeat', isCustom: false, userId: null },
  { name: 'Education', type: 'Expense', icon: 'FaGraduationCap', isCustom: false, userId: null },
  { name: 'Subscription', type: 'Expense', icon: 'FaTv', isCustom: false, userId: null },
  { name: 'Other', type: 'Expense', icon: 'FaQuestionCircle', isCustom: false, userId: null },

  // Default Income Categories
  { name: 'Salary', type: 'Income', icon: 'FaMoneyBillWave', isCustom: false, userId: null },
  { name: 'Freelance', type: 'Income', icon: 'FaLaptopCode', isCustom: false, userId: null },
  { name: 'Business', type: 'Income', icon: 'FaBriefcase', isCustom: false, userId: null },
  { name: 'Investment', type: 'Income', icon: 'FaChartLine', isCustom: false, userId: null },
  { name: 'Gift', type: 'Income', icon: 'FaGift', isCustom: false, userId: null },
  { name: 'Other', type: 'Income', icon: 'FaQuestionCircle', isCustom: false, userId: null },
];

/**
 * @desc    Get all categories (system defaults + current user's custom categories)
 * @route   GET /api/categories
 * @access  Private (Requires valid JWT Bearer token)
 * 
 * Process:
 * 1. Checks if default categories exist in MongoDB (`userId: null`).
 *    If count is 0, auto-seeds the 16 standard default categories.
 * 2. Fetches categories matching either `userId: null` (global) OR `userId: req.user._id` (custom).
 * 3. Sorts results logically (Expense first, default before custom, alphabetical by name).
 * 4. Returns 200 OK with the array of categories and total count.
 */
const getCategories = async (req, res, next) => {
  try {
    // Check if system default categories need auto-seeding
    const defaultCount = await Category.countDocuments({ userId: null });
    if (defaultCount === 0) {
      await Category.insertMany(DEFAULT_CATEGORIES);
    }

    // Hybrid retrieval: include global defaults (userId: null) AND this user's custom categories
    const categories = await Category.find({
      $or: [{ userId: null }, { userId: req.user._id }],
    }).sort({ type: 1, isCustom: 1, name: 1 });

    return res.status(200).json({
      success: true,
      count: categories.length,
      categories,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create a custom transaction category for the authenticated user
 * @route   POST /api/categories
 * @access  Private (Requires valid JWT Bearer token)
 * 
 * Process:
 * 1. Extracts `name`, `type`, and optional `icon` from validated `req.body`.
 * 2. Verifies whether the user already has a custom category with the same name and type.
 * 3. Sets `isCustom: true` and assigns `userId: req.user._id` for strict multi-tenant isolation.
 * 4. Saves and returns the created category with 201 Created.
 */
const createCustomCategory = async (req, res, next) => {
  try {
    const { name, type, icon } = req.body;

    // Escape regex special characters to prevent RegExp injection and handle names like "Tech (Hardware)"
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

    // Check if category already exists either as a system default or for this user
    const duplicateCategory = await Category.findOne({
      $or: [{ userId: null }, { userId: req.user._id }],
      name: { $regex: new RegExp(`^${escapedName}$`, 'i') },
      type,
    });

    if (duplicateCategory) {
      return res.status(400).json({
        success: false,
        message: `A category named "${name}" already exists for ${type}`,
      });
    }

    // Create the custom category scoped strictly to req.user._id
    const category = await Category.create({
      userId: req.user._id,
      name,
      type,
      icon: icon || 'FaQuestionCircle',
      isCustom: true,
    });

    return res.status(201).json({
      success: true,
      category,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getCategories,
  createCustomCategory,
  DEFAULT_CATEGORIES,
};
