/**
 * Utility to scrub credentials, private keys, API keys, and sensitive tokens
 * before they are logged or passed to external AI / LLM APIs.
 */

interface ScrubPattern {
  name: string;
  regex: RegExp;
  replacement: string | ((match: string, ...args: any[]) => string);
}

const SCRUB_PATTERNS: ScrubPattern[] = [
  // 1. Private keys and certificates
  {
    name: 'private_key',
    regex: /-----BEGIN [A-Za-z0-9_\- ]*PRIVATE KEY-----[\s\S]*?-----END [A-Za-z0-9_\- ]*PRIVATE KEY-----/g,
    replacement: '[REDACTED_PRIVATE_KEY]',
  },
  {
    name: 'certificate',
    regex: /-----BEGIN CERTIFICATE-----[\s\S]*?-----END CERTIFICATE-----/g,
    replacement: '[REDACTED_CERTIFICATE]',
  },

  // 2. OpenAI API keys (sk-..., sk-proj-...)
  {
    name: 'openai_key',
    regex: /\b(sk-(?:proj-)?[A-Za-z0-9_-]{20,})\b/g,
    replacement: '[REDACTED_API_KEY]',
  },

  // 3. Anthropic API keys (sk-ant-...)
  {
    name: 'anthropic_key',
    regex: /\b(sk-ant-[A-Za-z0-9_-]{20,})\b/g,
    replacement: '[REDACTED_API_KEY]',
  },

  // 4. GitHub tokens (ghp_..., gho_..., github_pat_...)
  {
    name: 'github_token',
    regex: /\b(gh[pousr]_[A-Za-z0-9_]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/g,
    replacement: '[REDACTED_GITHUB_TOKEN]',
  },

  // 5. AWS Access Key IDs
  {
    name: 'aws_key',
    regex: /\b((?:AKIA|ASIA|AROA)[A-Z0-9]{16})\b/g,
    replacement: '[REDACTED_AWS_KEY]',
  },

  // 6. Google API Keys (AIza...)
  {
    name: 'google_key',
    regex: /\b(AIza[0-9A-Za-z-_]{35})\b/g,
    replacement: '[REDACTED_GOOGLE_KEY]',
  },

  // 7. Slack tokens (xoxb-..., xoxp-...)
  {
    name: 'slack_token',
    regex: /\b(xox[baprs]-[0-9a-zA-Z-]{10,})\b/g,
    replacement: '[REDACTED_SLACK_TOKEN]',
  },

  // 8. Stripe API keys (sk_live_..., rk_live_...)
  {
    name: 'stripe_key',
    regex: /\b((?:sk|rk)_(?:live|test)_[0-9a-zA-Z]{24,})\b/g,
    replacement: '[REDACTED_STRIPE_KEY]',
  },

  // 9. JSON Web Tokens (JWT: eyJ...)
  {
    name: 'jwt',
    regex: /\beyJ[A-Za-z0-9_-]{10,}\.eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g,
    replacement: '[REDACTED_JWT]',
  },

  // 10. Passwords in connection URIs (e.g. postgresql://user:password@host:5432/db)
  {
    name: 'uri_credentials',
    regex: /([a-zA-Z][a-zA-Z0-9+.-]*:\/\/[^\s'":]+):([^\s'"]+?)@([a-zA-Z0-9_.-]+(?::[0-9]+)?(?:\/|$))/g,
    replacement: '$1:[REDACTED_PASSWORD]@$3',
  },

  // 11. Code / config assignments of secret keys or passwords (avoiding re-redacting existing tags)
  {
    name: 'secret_assignment',
    regex: /((?:api[_-]?key|secret|token|password|passwd|auth[_-]?token|client[_-]?secret)\s*[:=]\s*["'])(?!\[REDACTED_)([^"'\r\n]{6,})(["'])/gi,
    replacement: '$1[REDACTED_SECRET]$3',
  },
];

/**
 * Remove sensitive credentials from a text string before exposing to LLM or public logs.
 */
export function scrubSecrets(input: string): string {
  if (!input || typeof input !== 'string') return input;
  let result = input;
  for (const { regex, replacement } of SCRUB_PATTERNS) {
    if (typeof replacement === 'string') {
      result = result.replace(regex, replacement);
    } else {
      result = result.replace(regex, replacement as any);
    }
  }
  return result;
}
