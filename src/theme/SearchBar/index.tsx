import React from 'react';
import styles from './styles.module.css';

export default function SearchBar() {
  const handleClick = () => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('open-blueprint-assistant'));
    }
  };

  return (
    <button
      type="button"
      className={styles.searchBarButton}
      onClick={handleClick}
      title="Search architectures, trade-offs & blueprints (Ctrl+K or ⌘K)"
      aria-label="Search Blueprints">
      <svg
        className={styles.searchIcon}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </svg>
      <span className={styles.searchText}>Search Blueprints...</span>
      <kbd className={styles.kbdBadge}>⌘K</kbd>
    </button>
  );
}
