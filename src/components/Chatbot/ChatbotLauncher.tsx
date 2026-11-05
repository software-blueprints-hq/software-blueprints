import React, { useState } from 'react';
import styles from './chatbot.module.css';
import ChatbotModal from './ChatbotModal';

export default function ChatbotLauncher() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={styles.launcherBtn}
        aria-label={isOpen ? 'Close architecture assistant' : 'Open architecture assistant'}
        title="Software Blueprints Assistant">
        {isOpen ? '✕' : '💬'}
        {!isOpen && <span className={styles.launcherBadge}>AI</span>}
      </button>

      <ChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
