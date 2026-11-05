import React from 'react';
import ChatbotLauncher from '../components/Chatbot/ChatbotLauncher';

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ChatbotLauncher />
    </>
  );
}
