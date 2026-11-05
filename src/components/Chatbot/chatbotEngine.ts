import {
  BLUEPRINT_CATALOG,
  BlueprintEntry,
  UserBlueprintRequest,
  ARCHITECTURAL_EXPLANATIONS,
} from './knowledgeBase';

const STORAGE_KEY = 'software_blueprints_user_requests';

export interface ChatMessage {
  id: string;
  sender: 'bot' | 'user';
  text: string;
  recommendations?: BlueprintEntry[];
  isRequestPrompt?: boolean;
  timestamp: string;
}

// Common English stop-words that pollute search relevance
const STOP_WORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'could',
  'did', 'do', 'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has',
  'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if',
  'in', 'into', 'is', 'it', 'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor',
  'not', 'now', 'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out',
  'over', 'own', 'same', 'she', 'should', 'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs',
  'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very', 'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who',
  'whom', 'why', 'with', 'would', 'you', 'your', 'yours', 'yourself', 'yourselves', 'show', 'give',
  'tell', 'want', 'need', 'implement', 'build', 'create', 'make', 'use', 'using', 'please', 'help',
]);

export class ChatbotEngine {
  /**
   * Normalizes words: strips punctuation and applies simple English stemming.
   */
  static stemWord(word: string): string {
    return word
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .replace(/(?:ing|ers|er|ed|es|s)$/, '');
  }

  /**
   * Tokenizes and strips filler stop words from user query.
   */
  static extractMeaningfulTokens(query: string): string[] {
    const rawTokens = query
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);

    return rawTokens.filter((token) => !STOP_WORDS.has(token) && token.length > 1);
  }

  /**
   * Checks for matches against architectural explanations.
   */
  static findConceptMatch(query: string): { explanation: string; entry: BlueprintEntry } | null {
    const lower = query.toLowerCase();

    for (const concept of ARCHITECTURAL_EXPLANATIONS) {
      const isMatch = concept.keywords.some((kw) => {
        // Exact substring match for phrases like 'rate limit' or 'virtual threads'
        if (kw.includes(' ') && lower.includes(kw)) return true;
        // Exact word match
        const regex = new RegExp(`\\b${kw}\\b`, 'i');
        return regex.test(lower);
      });

      if (isMatch) {
        const entry = BLUEPRINT_CATALOG.find((b) => b.id === concept.targetBlueprintId);
        if (entry) {
          return { explanation: concept.explanation, entry };
        }
      }
    }

    return null;
  }

  /**
   * Searches the catalog with stemming, tag weighting, and minimum match threshold.
   */
  static searchCatalog(query: string): BlueprintEntry[] {
    const meaningfulTokens = this.extractMeaningfulTokens(query);
    if (meaningfulTokens.length === 0) return [];

    const stemmedTokens = meaningfulTokens.map(this.stemWord);

    const scored = BLUEPRINT_CATALOG.map((entry) => {
      let score = 0;
      const titleLower = entry.title.toLowerCase();
      const descLower = entry.description.toLowerCase();
      const pillarLower = entry.pillar.toLowerCase();

      for (let i = 0; i < meaningfulTokens.length; i++) {
        const rawToken = meaningfulTokens[i];
        const stemmed = stemmedTokens[i];

        // 1. Direct title matches (highest confidence)
        if (titleLower.includes(rawToken)) score += 25;
        else if (titleLower.includes(stemmed)) score += 15;

        // 2. Tag matches
        for (const tag of entry.tags) {
          const tagStem = this.stemWord(tag);
          if (tag === rawToken) score += 20;
          else if (tagStem === stemmed) score += 14;
          else if (tag.includes(rawToken) || rawToken.includes(tag)) score += 8;
        }

        // 3. Pillar matches
        if (pillarLower.includes(rawToken)) score += 6;

        // 4. Description matches
        if (descLower.includes(rawToken)) score += 4;
        else if (descLower.includes(stemmed)) score += 2;
      }

      return { entry, score };
    });

    // Enforce minimum threshold (score >= 12) so random noise never surfaces!
    return scored
      .filter((s) => s.score >= 12)
      .sort((a, b) => b.score - a.score)
      .map((s) => s.entry)
      .slice(0, 3);
  }

  /**
   * Generates intelligent, accurate response.
   */
  static processUserMessage(input: string): ChatMessage {
    const trimmed = input.trim();
    const lower = trimmed.toLowerCase();
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    // 1. Check if user is asking to request a new blueprint/feature
    const isRequestIntent =
      lower.includes('request') ||
      lower.includes('can you add') ||
      lower.includes('add a blueprint') ||
      lower.includes('new blueprint') ||
      lower.includes('feature request') ||
      lower.includes('submit request');

    if (isRequestIntent) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `I'd love to help add that to our roadmap! Fill out the quick request card below and I'll log it directly to our implementation tracker:`,
        isRequestPrompt: true,
        timestamp: timeStr,
      };
    }

    // 2. Greetings
    if (['hi', 'hello', 'hey', 'start', 'help'].some((g) => lower === g || lower.startsWith(g + ' '))) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Hello! I am your Software Blueprints Architecture Assistant. I can explain any of our 55 production patterns across all 7 pillars, point you directly to working implementations, or record new blueprint requests. What architecture or component are you designing?`,
        recommendations: [
          BLUEPRINT_CATALOG.find((b) => b.id === 'agent-supervisor')!,
          BLUEPRINT_CATALOG.find((b) => b.id === 'sys-rate-limiter')!,
          BLUEPRINT_CATALOG.find((b) => b.id === 'fullstack-multi-tenant')!,
        ].filter(Boolean),
        timestamp: timeStr,
      };
    }

    // 3. Exact Concept Explanation Match (Delivers real architectural answer!)
    const conceptMatch = this.findConceptMatch(trimmed);
    if (conceptMatch) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `${conceptMatch.explanation}\n\nHere is the complete blueprint with architecture diagrams, working code, and hardening checklists:`,
        recommendations: [conceptMatch.entry],
        timestamp: timeStr,
      };
    }

    // 4. Filtered Keyword Search across catalog
    const matches = this.searchCatalog(trimmed);

    if (matches.length > 0) {
      return {
        id: `bot-${Date.now()}`,
        sender: 'bot',
        text: `Here are the matching production blueprints from our catalog:`,
        recommendations: matches,
        timestamp: timeStr,
      };
    }

    // 5. No match found -> Offer to record as new request!
    return {
      id: `bot-${Date.now()}`,
      sender: 'bot',
      text: `We don't currently have a dedicated blueprint for "${trimmed}" in our 55-blueprint catalog. Would you like to submit this as an architecture request so we can build and add it?`,
      isRequestPrompt: true,
      timestamp: timeStr,
    };
  }

  // -------------------------------------------------------------------------
  // LocalStorage Request Store (Client-Side, Zero Cost)
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
