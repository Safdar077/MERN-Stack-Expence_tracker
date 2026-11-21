import React from 'react';
import {
  FaUtensils,
  FaCar,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaHome,
  FaGamepad,
  FaHeartbeat,
  FaGraduationCap,
  FaTv,
  FaQuestionCircle,
  FaMoneyBillWave,
  FaLaptopCode,
  FaBriefcase,
  FaChartLine,
  FaGift,
  FaTag,
} from 'react-icons/fa';

/**
 * Registry mapping category icon identifiers stored in database documents
 * to their respective react-icons component implementations.
 */
const ICON_MAP = {
  FaUtensils,
  FaCar,
  FaShoppingBag,
  FaFileInvoiceDollar,
  FaHome,
  FaGamepad,
  FaHeartbeat,
  FaGraduationCap,
  FaTv,
  FaQuestionCircle,
  FaMoneyBillWave,
  FaLaptopCode,
  FaBriefcase,
  FaChartLine,
  FaGift,
  FaTag,
};

/**
 * CategoryIcon Component
 *
 * Renders the corresponding React Icon for a transaction category with fallback to FaTag.
 * Uses `react-icons/fa` exclusively in adherence to project icon guidelines.
 *
 * @param {Object} props
 * @param {string} [props.icon] - String icon identifier (e.g. 'FaUtensils')
 * @param {string} [props.className] - Tailwind CSS classes for sizing and coloring
 */
export const CategoryIcon = ({ icon, className = 'w-4 h-4' }) => {
  const IconComponent = (icon && ICON_MAP[icon]) ? ICON_MAP[icon] : FaTag;
  return <IconComponent className={className} aria-hidden="true" />;
};

export default CategoryIcon;
