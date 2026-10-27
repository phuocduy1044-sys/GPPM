import { isAvailable, chat, providerName, NOT_AVAILABLE } from '../llm/client.js';
import { loadConfig } from '../config.js';
import type { Finding, GraphNode, GraphEdge, ProviderInfo, AnalysisMode } from './types.js';
import type { ScannedFile } from './scanner.js';
import { scrubSecrets } from './scrub.js';
import { selectGraphContext, validateAiFinding, type SelectedContextResult } from './contextSelector.js';
import { z } from 'zod';

export { selectGraphContext, validateAiFinding };

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
  contextMeta?: SelectedContextResult;
}

export interface AiEnhancementOptions {
  edges?: GraphEdge[];
  signal?: AbortSignal;
  maxContextTokens?: number;
  projectRoot?: string;
}

export async function runAiEnhancement(
  ruleFindings: Finding[],
  files: ScannedFile[],
  nodes: GraphNode[],
  requestedMode?: AnalysisMode,
  userRequirement?: string,
  options?: AiEnhancementOptions
): Promise<AiReviewResult> {
  const currentProvider = providerName();
  const currentModel = loadConfig().model || 'default';

  // Perform Call Graph Context Selection (eliminates Probe 10)
  const selectedContext = selectGraphContext({
    files,
    nodes,
    edges: options?.edges,
    ruleFindings,
    userRequirement,
    maxTokens: options?.maxContextTokens || 8000,
  });

  if (requestedMode === 'rules' || requestedMode === 'rules_only_fallback') {
    return {
      findings: ruleFindings,
      providerInfo: {
        provider: currentProvider,
        model: currentModel,
        isFallback: false,
        provenance: {
          selectedFiles: selectedContext.selectedFiles,
          selectedNodes: selectedContext.selectedNodes,
          graphNeighborhoodSize: selectedContext.neighborNodesCount,
          completedAt: new Date().toISOString(),
        },
      },
      mode: 'rules_only_fallback',
      contextMeta: selectedContext,
    };
  }

  // Check early cancellation
  if (options?.signal?.aborted) {
    return {
      findings: ruleFindings,
      providerInfo: {
        provider: currentProvider,
        model: currentModel,
        isFallback: true,
        fallbackReason: 'AI review request was cancelled before execution',
        provenance: {
          selectedFiles: selectedContext.selectedFiles,
          selectedNodes: selectedContext.selectedNodes,
          graphNeighborhoodSize: selectedContext.neighborNodesCount,
          completedAt: new Date().toISOString(),
        },
      },
      mode: 'rules_only_fallback',
      contextMeta: selectedContext,
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
        provenance: {
          selectedFiles: selectedContext.selectedFiles,
          selectedNodes: selectedContext.selectedNodes,
          graphNeighborhoodSize: selectedContext.neighborNodesCount,
          completedAt: new Date().toISOString(),
        },
      },
      mode: 'rules_only_fallback',
      contextMeta: selectedContext,
    };
  }

  // Prepare findings summary for enrichment
  const ruleFindingsSummary = ruleFindings.map(f => ({
    id: f.id,
    ruleId: f.ruleId,
    category: f.category,
    severity: f.severity,
    file: f.filePath,
    line: f.line,
    nodeId: f.nodeId,
    evidence: scrubSecrets(f.evidence),
  }));

  const cleanRequirement = userRequirement ? scrubSecrets(userRequirement) : undefined;
  const reqSection = cleanRequirement
    ? `\nĐẶC BIỆT CHÚ Ý YÊU CẦU CỦA NGƯỜI DÙNG: "${cleanRequirement}". Hãy ưu tiên phân tích sâu, làm rõ và bổ sung các vấn đề liên quan trực tiếp đến yêu cầu này.\n`
    : '';

  const prompt = `Bạn là chuyên gia thẩm định mã nguồn (AI Code Reviewer).${reqSection}
Dưới đây là thông tin Call Graph và ngữ cảnh mã nguồn được trích xuất theo độ ưu tiên đồ thị, kèm danh sách các vấn đề (findings) đã được phát hiện tĩnh bằng AST rules.

${selectedContext.formattedContext}

FINDINGS HIỆN CÓ CẦN LÀM RÕ (ENRICH):
${JSON.stringify(ruleFindingsSummary, null, 2)}

NHIỆM VỤ CỦA BẠN:
1. Giải thích sâu sắc nguyên nhân và gợi ý khắc phục bằng tiếng Việt cho các finding hiện có, căn cứ vào liên hệ caller/callee trên Call Graph.
2. Nếu phát hiện thêm lỗi nghiêm trọng (security/bug) có bằng chứng thật trong mã nguồn trên, hãy bổ sung vào additionalFindings. Tuyệt đối không bịa đặt tên file hoặc số dòng không có thật.
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
    let promptEvalTokens = 0;
    let evalTokens = 0;

    const chatStream = chat(
      currentModel,
      [
        { role: 'system', content: 'You are an expert static analysis & code reviewer assistant. Always reply with valid JSON only.' },
        { role: 'user', content: prompt }
      ],
      undefined,
      { temperature: 0.1, signal: options?.signal }
    );

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('AI review request timed out after 30 seconds')), 30000)
    );

    const abortPromise = new Promise<never>((_, reject) => {
      if (options?.signal) {
        if (options.signal.aborted) {
          reject(new Error('AI review request was cancelled'));
        } else {
          options.signal.addEventListener('abort', () => {
            reject(new Error('AI review request was cancelled'));
          }, { once: true });
        }
      }
    });

    const collectPromise = (async () => {
      for await (const chunk of chatStream) {
        if (options?.signal?.aborted) {
          throw new Error('AI review request was cancelled');
        }
        if (chunk.content) chunks.push(chunk.content);
        if (typeof chunk.prompt_eval_count === 'number') promptEvalTokens = chunk.prompt_eval_count;
        if (typeof chunk.eval_count === 'number') evalTokens = chunk.eval_count;
      }
      return chunks.join('');
    })();

    const responseText = await Promise.race([collectPromise, timeoutPromise, abortPromise]);

    // Parse JSON defensively
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
          explanation: enrichment.explanation ? scrubSecrets(enrichment.explanation) : rf.explanation,
          suggestion: enrichment.suggestion ? scrubSecrets(enrichment.suggestion) : rf.suggestion,
          source: 'both',
        };
      }
      return rf;
    });

    // Validate and add additional findings with AST validator
    let extraCounter = 1;
    for (const af of validated.additionalFindings) {
      const validFinding = validateAiFinding(
        af,
        files,
        nodes,
        () => `find-ai-${String(extraCounter++).padStart(2, '0')}`
      );
      if (validFinding) {
        mergedFindings.push(validFinding);
      }
    }

    const promptTokens = promptEvalTokens > 0 ? promptEvalTokens : Math.ceil(prompt.length / 4);
    const completionTokens = evalTokens > 0 ? evalTokens : Math.ceil(responseText.length / 4);
    const totalTokens = promptTokens + completionTokens;

    return {
      findings: mergedFindings,
      providerInfo: {
        provider: currentProvider,
        model: currentModel,
        isFallback: false,
        usage: {
          promptTokens,
          completionTokens,
          totalTokens,
          estimated: promptEvalTokens === 0,
        },
        provenance: {
          selectedFiles: selectedContext.selectedFiles,
          selectedNodes: selectedContext.selectedNodes,
          graphNeighborhoodSize: selectedContext.neighborNodesCount,
          completedAt: new Date().toISOString(),
        },
      },
      mode: 'ai',
      contextMeta: selectedContext,
    };
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    const sanitizedError = scrubSecrets(errorMsg)
      .replace(/(?:sk-[a-zA-Z0-9_-]{8,}|key-[a-zA-Z0-9_-]{8,}|Bearer\s+[a-zA-Z0-9_\-\.]{15,})/g, '[REDACTED_KEY]')
      .replace(/((?:api[_-]?key|secret|password|token)\s*[:=]\s*['"]?)[a-zA-Z0-9_\-\.]{8,}(['"]?)/gi, '$1[REDACTED]$2');

    return {
      findings: ruleFindings,
      providerInfo: {
        provider: currentProvider,
        model: currentModel,
        isFallback: true,
        fallbackReason: `AI call failed, fell back to rules-only: ${sanitizedError}`,
        provenance: {
          selectedFiles: selectedContext.selectedFiles,
          selectedNodes: selectedContext.selectedNodes,
          graphNeighborhoodSize: selectedContext.neighborNodesCount,
          completedAt: new Date().toISOString(),
        },
      },
      mode: 'rules_only_fallback',
      contextMeta: selectedContext,
    };
  }
}
