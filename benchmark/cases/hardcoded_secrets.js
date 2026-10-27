/**
 * Benchmark Case: Hardcoded Secrets Detection
 * Contains 3 test cases (2 vulnerable, 1 clean)
 */

// BM-09: Vulnerable - Hardcoded API Key in source code
export function initOpenAIClient() {
  const OPENAI_API_KEY = "sk-proj-DEMOONLY9876543210abcdef9876543210abcdef9876";
  return { apiKey: OPENAI_API_KEY, endpoint: 'https://api.openai.com/v1' };
}

// BM-10: Vulnerable - Hardcoded AWS Access Key ID
export function getAwsCredentials() {
  const awsKeyId = "AKIAIOSFODNN7EXAMPLE";
  return { accessKeyId: awsKeyId, region: 'ap-southeast-1' };
}

// BM-11: Safe/Clean - Access secrets via secure environment variables
export function getVaultSecret(keyName) {
  const secret = process.env[keyName];
  if (!secret) {
    throw new Error(`Missing environment variable: ${keyName}`);
  }
  return secret;
}
