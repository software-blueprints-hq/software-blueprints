import { BLUEPRINT_CATALOG, BlueprintEntry, UserBlueprintRequest } from './knowledgeBase';

const STORAGE_KEY = 'software_blueprints_user_requests';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  recommendations?: BlueprintEntry[];
  isRequestPrompt?: boolean;
  timestamp: string;
}

export class ChatbotEngine {
  /**
   * Searches the catalog based on fuzzy word match and tags.
   */
  static searchCatalog(query: string): BlueprintEntry[] {
    const tokens = query.toLowerCase().replace(/[^a-z0-9\s-]/g, '').split(/\s+/).filter(Boolean);
    if (tokens.length === 0) return [];

    const scored = BLUEPRINT_CATALOG.map((entry) => {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const descLower = entry.description.toLowerCase();
      const pillarLower = entry.pillar.toLowerCase();

      for (const token of tokens) {
        if (titleLower.includes(token)) score += 10;
        if (entry.tags.some((t) => t.includes(token) || token.includes(t))) score += 7;
        if (descLower.includes(token)) score += 4;
        if (pillarLower.includes(token)) score += 3;
      }

      return { entry, score };
    });

    return scored
      .filter((s) => s.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.entry)
      .slice(0, 4);
  }

  /**
   * Generates an intelligent bot response.
   */
  static processUserMessage(input: string): ChatMessage {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();

    // Check if the user is asking to request something new
    const isRequestIntent = 
      lower.includes('request') || 
      lower.includes('can you add') || 
      lower.includes('add a blueprint') || 
      lower.includes('new blueprint') || 
      lower.includes('i need a blueprint for') || 
      lower.includes('feature request');

    // 1. Explicit request intake trigger
    if (isRequestIntent) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `I'd love to help add that to our roadmap! Please fill in the quick request form below so our team can architect and implement it.`,
        isRequestPrompt: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    // 2. Greeting / Help intent
    if (['hi', 'hello', 'hey', 'help', 'what can you do'].some((g) => lower === g || lower.startsWith(g + ' '))) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Hello! I am your Software Blueprints Architecture Assistant. I can help you locate production blueprints across all 7 pillars, or submit a request for new architectures you'd like us to build. What are you looking to architect today?`,
        recommendations: [
          BLUEPRINT_CATALOG.find((b) => b.id === 'agent-supervisor')!,
          BLUEPRINT_CATALOG.find((b) => b.id === 'sys-rate-limiter')!,
          BLUEPRINT_CATALOG.find((b) => b.id === 'rag-hybrid')!,
        ].filter(Boolean),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    // 3. Search catalog
    const matches = this.searchCatalog(trimmed);

    if (matches.length > 0) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Here are the best matching production blueprints from our catalog for "${trimmed}":`,
        recommendations: matches,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
    }

    // 4. No match found -> Offer to record it as a feature request!
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `I couldn't find an existing blueprint directly matching "${trimmed}" in our current 55-blueprint catalog. Would you like to submit this as a new architecture request so we can build it?`,
      isRequestPrompt: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
  }

  // -------------------------------------------------------------------------
  // LocalStorage Request Store
  // -------------------------------------------------------------------------

  static saveRequest(data: { topic: string; pillar: string; details: string; contactEmail?: string }): UserBlueprintRequest {
    const existing = this.getStoredRequests();
    const newRecord: UserBlueprintRequest = {
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      topic: data.topic,
      pillar: data.pillar || 'Other',
      details: data.details,
      contactEmail: data.contactEmail,
      createdAt: new Date().toISOString(),
      status: 'pending',
    };

    const updated = [newRecord, ...existing];
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      }
    } catch (e) {
      console.error('Failed to save blueprint request to localStorage', e);
    }

    return newRecord;
  }

  static getStoredRequests(): UserBlueprintRequest[] {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : [];
      }
    } catch (e) {
      console.error('Failed to read blueprint requests from localStorage', e);
    }
    return [];
  }

  static deleteStoredRequest(id: string): UserBlueprintRequest[] {
    const current = this.getStoredRequests();
    const filtered = current.filter((r) => r.id !== id);
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
      }
    } catch (e) {
      console.error('Failed to delete request from localStorage', e);
    }
    return filtered;
  }

  static exportRequestsAsMarkdown(): string {
    const requests = this.getStoredRequests();
    if (requests.length === 0) return '# No requests currently recorded.';

    let md = '# 📋 Requested Architecture Blueprints\n\n';
    md += '| ID | Date | Topic | Pillar | Details | Contact | Status |\n';
    md += '| :--- | :--- | :--- | :--- | :--- | :--- | :--- |\n';

    for (const r of requests) {
      const date = new Date(r.createdAt).toLocaleDateString();
      const safeDetails = r.details.replace(/\|/g, '\\|').replace(/\n/g, ' ');
      md += `| \`${r.id}\` | ${date} | **${r.topic}** | ${r.pillar} | ${safeDetails} | ${r.contactEmail || 'N/A'} | \`${r.status}\` |\n`;
    }

    return md;
  }
}
