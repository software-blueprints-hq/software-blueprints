import * as d3 from 'd3';
import { selection } from 'd3-selection';
import 'd3-transition';

function patchPrototypes() {
  const fakeTransition = function (this: any) {
    const self = this;
    const chainable = {
      duration() {
        return this;
      },
      delay() {
        return this;
      },
      ease() {
        return this;
      },
      style(name: string, value: any) {
        if (self.style) self.style(name, value);
        return this;
      },
      attr(name: string, value: any) {
        if (self.attr) self.attr(name, value);
        return this;
      },
      text(val: string) {
        if (self.text) self.text(val);
        return this;
      },
      html(val: string) {
        if (self.html) self.html(val);
        return this;
      },
      on() {
        return this;
      },
      remove() {
        if (self.remove) self.remove();
        return this;
      },
    };
    return chainable;
  };

  const targets = [
    selection?.prototype,
    (d3 as any)?.selection?.prototype,
  ].filter(Boolean);

  for (const proto of targets) {
    if (!proto.transition) {
      proto.transition = fakeTransition;
    }
    if (!proto.interrupt) {
      proto.interrupt = function () {
        return this;
      };
    }
  }
}

if (typeof window !== 'undefined') {
  patchPrototypes();

  // Suppress uncaught tooltipElem.transition errors from breaking the UI overlay
  window.addEventListener('error', (event) => {
    if (
      event?.message?.includes('tooltipElem.transition') ||
      event?.error?.message?.includes('tooltipElem.transition')
    ) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return true;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    if (
      event?.reason?.message?.includes('tooltipElem.transition')
    ) {
      event.preventDefault();
      return true;
    }
  });
}

export default patchPrototypes;
