import React from 'react';
import ChatbotLauncher from '../components/Chatbot/ChatbotLauncher';
import ExportPdfButton from '../components/ExportPdfButton';
import patchPrototypes from '../clientModules/d3-polyfill';

if (typeof window !== 'undefined') {
  patchPrototypes();
}

export default function Root({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ExportPdfButton />
      <ChatbotLauncher />
    </>
  );
}
