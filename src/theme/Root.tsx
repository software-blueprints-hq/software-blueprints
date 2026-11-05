import React from 'react';
import ChatbotLauncher from '../components/Chatbot/ChatbotLauncher';
import ExportPdfButton from '../components/ExportPdfButton';
import { selection } from 'd3-selection';
import 'd3-transition';

// Ensure d3-transition is permanently bound to d3-selection prototype with fallback
if (typeof window !== 'undefined' && selection && selection.prototype) {
  if (!selection.prototype.transition) {
    (selection.prototype as any).transition = function () {
      const self = this;
      return {
        duration() {
          return this;
        },
        style(name: string, value: any) {
          self.style(name, value);
          return this;
        },
        attr(name: string, value: any) {
          self.attr(name, value);
          return this;
        },
        text(val: string) {
          self.text(val);
          return this;
        },
        html(val: string) {
          self.html(val);
          return this;
        },
      };
    };
  }
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
