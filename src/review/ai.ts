import { isAvailable, chat, providerName, NOT_AVAILABLE } from '../llm/client.js';
import { loadConfig } from '../config.js';
import type { Finding, GraphNode, ProviderInfo, AnalysisMode } from './types.js';
import type { ScannedFile } from './scanner.js';
import { z } from 'zod';

const AiFindingSchema = z.object({
  ruleId: z.string(),
  category: z.enum(['bug', 'security', 'style', 'maintainability']),
  severity: z.enum(['critical', 'high', 'medium', 'low', 'info']),
  title: z.string(),
  filePath: z.string(),
  line: z.number(),
  endLine: z.number().optional(),
  evidence: z.string(),
  explanation: z.string(),
  suggestion: z.string(),
  confidence: z.enum(['certain', 'high', 'medium', 'low']).default('high'),
});

const AiResponseSchema = z.object({
  additionalFindings: z.array(AiFindingSchema).default([]),
  enrichedFindings: z.array(z.object({
    findingId: z.string(),
    explanation: z.string().optional(),
    suggestion: z.string().optional(),
  })).default([]),
});

export interface AiReviewResult {
  findings: Finding[];
  providerInfo: ProviderInfo;
  mode: 'ai' | 'rules_only_fallback';
}

export async function runAiEnhancement(
  ruleFindings: Finding[],
  files: ScannedFile[],
  nodes: GraphNode[],
  requestedMode?: AnalysisMode
): Promise<AiReviewResult> {
  const currentProvider = providerName();
  const currentModel = loadConfig().model || 'default';

  if (requestedMode === 'rules') {
    return {
      findings: ruleFindings,
      providerInfo: {
        provider: currentProvider,
        model: currentModel,
        isFallback: false,
      },
      mode: 'rules_only_fallback',
    };
  }

  // Check if provider is available
  if (!isAvailable()) {
    const reason = NOT_AVAILABLE();
    return {
      findings: ruleFindings,
      providerInfo: {
        provider: currentProvider,
        model: currentModel,
        isFallback: true,
        fallbackReason: `LLM Provider '${currentProvider}' is not available: ${reason}`,
      },
      mode: 'rules_only_fallback',
    };
  }

  // Prepare condensed code & graph context for AI prompt
  const fileSummaries = files.slice(0, 10).map(f => {
    return `--- FILE: ${f.relativePath} ---\n${f.content.slice(0, 2000)}`;
  }).join('\n\n');

  const ruleFindingsSummary = ruleFindings.map(f => ({
    id: f.id,
    ruleId: f.ruleId,
    category: f.category,
    severity: f.severity,
    file: f.filePath,
    line: f.line,
    evidence: f.evidence,
  }));

  const prompt = `Bạn là chuyên gia thẩm định mã nguồn (AI Code Reviewer).
Dưới đây là mã nguồn dự án và danh sách các vấn đề (findings) đã được phát hiện tĩnh bằng AST rules.

MÃ NGUỒN DỰ ÁN:
${fileSummaries}

FINDINGS HIỆN CÓ:
${JSON.stringify(ruleFindingsSummary, null, 2)}

NHIỆM VỤ CỦA BẠN:
1. Giải thích sâu sắc nguyên nhân và gợi ý khắc phục bằng tiếng Việt cho các finding hiện có.
2. Nếu phát hiện thêm lỗi nghiêm trọng (security/bug) có bằng chứng thật trong mã nguồn trên, hãy bổ sung vào additionalFindings.
3. CHỈ TRẢ VỀ JSON theo cấu trúc sau (không kèm markdown phụ, không kèm văn bản ngoài):
{
  "enrichedFindings": [
    {
      "findingId": "id-cua-finding",
      "explanation": "giải thích chi tiết bằng tiếng Việt...",
      "suggestion": "hướng dẫn sửa chi tiết bằng tiếng Việt..."
    }
  ],
  "additionalFindings": [
    {
      "ruleId": "MAINT_SMELL",
      "category": "maintainability",
      "severity": "medium",
      "title": "Tiêu đề tiếng Việt",
      "filePath": "src/app.ts",
      "line": 15,
      "evidence": "đoạn code thật trong file",
      "explanation": "giải thích...",
      "suggestion": "gợi ý...",
      "confidence": "high"
    }
  ]
}`;

  try {
    const chunks: string[] = [];
    const chatStream = chat(currentModel, [
      { role: 'system', content: 'You are an expert static analysis & code reviewer assistant. Always reply with valid JSON only.' },
      { role: 'user', content: prompt }
    ], undefined, { temperature: 0.1 });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI review request timed out after 30 seconds')), 30000)
    );

    const collectPromise = (async () => {
      for await (const chunk of chatStream) {
        if (chunk.content) chunks.push(chunk.content);
      }
      return chunks.join('');
    })();

    const responseText = await Promise.race([collectPromise, timeoutPromise]);

    // Parse JSON
    let parsedJson: unknown;
    try {
      const cleaned = responseText.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();
      parsedJson = JSON.parse(cleaned);
    } catch {
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        parsedJson = JSON.parse(match[0]);
      } else {
        throw new Error('LLM response did not contain valid JSON');
      }
    }

    const validated = AiResponseSchema.parse(parsedJson);

    // Merge enrichments
    const mergedFindings: Finding[] = ruleFindings.map(rf => {
      const enrichment = validated.enrichedFindings.find(e => e.findingId === rf.id);
      if (enrichment) {
        return {
          ...rf,
          explanation: enrichment.explanation || rf.explanation,
          suggestion: enrichment.suggestion || rf.suggestion,
          source: 'both',
        };
      }
      return rf;
    });

    // Add valid additional findings
    let extraCounter = 1;
    for (const af of validated.additionalFindings) {
      // Verify file exists
      const fileExists = files.some(f => f.relativePath === af.filePath);
      if (!fileExists) continue;

      mergedFindings.push({
        id: `find-ai-${String(extraCounter++).padStart(2, '0')}`,
        ruleId: af.ruleId,
        category: af.category,
        severity: af.severity,
        title: af.title,
        filePath: af.filePath,
        line: af.line,
        endLine: af.endLine || af.line,
        evidence: af.evidence,
        explanation: af.explanation,
        suggestion: af.suggestion,
        source: 'ai',
        confidence: af.confidence,
      });
    }

    return {
      findings: mergedFindings,
      providerInfo: {
        provider: currentProvider,
        model: currentModel,
        isFallback: false,
      },
      mode: 'ai',
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    return {
      findings: ruleFindings,
      providerInfo: {
        provider: currentProvider,
        model: currentModel,
        isFallback: true,
        fallbackReason: `AI call failed, fell back to rules-only: ${errorMsg}`,
      },
      mode: 'rules_only_fallback',
    };
  }
}
