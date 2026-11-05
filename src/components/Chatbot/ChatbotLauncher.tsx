import React, { useState, useEffect } from 'react';
import styles from './chatbot.module.css';
import ChatbotModal from './ChatbotModal';

export default function ChatbotLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Toggle modal on Ctrl+K or Cmd+K
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      }
      // Close on Escape
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('open-blueprint-assistant', handleCustomOpen);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('open-blueprint-assistant', handleCustomOpen);
    };
  }, [isOpen]);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.floatingLauncher}
        aria-label={isOpen ? 'Close architecture assistant' : 'Open architecture assistant (Ctrl+K)'}
        title="Software Blueprints Assistant (Ctrl+K)">
        <span className={styles.sparkleIcon}>✨</span>
        <span className={styles.launcherText}>AI Assistant</span>
        <span className={styles.kbdBadge}>⌘K</span>
      </button>

      <ChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
