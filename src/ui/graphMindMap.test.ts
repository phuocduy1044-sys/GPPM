import { describe, it, expect } from 'vitest'
import { detectLanguage, generateMindMap } from './graphMindMap.js'
import type { ReviewReport } from '../review/types.js'

describe('graphMindMap', () => {
  describe('detectLanguage', () => {
    it('detects common programming languages by extension', () => {
      expect(detectLanguage('src/app.ts')).toBe('TypeScript')
      expect(detectLanguage('web/index.tsx')).toBe('TypeScript')
      expect(detectLanguage('server.js')).toBe('JavaScript')
      expect(detectLanguage('script.py')).toBe('Python')
      expect(detectLanguage('main.go')).toBe('Go')
      expect(detectLanguage('lib.rs')).toBe('Rust')
      expect(detectLanguage('App.java')).toBe('Java')
      expect(detectLanguage('query.sql')).toBe('SQL')
      expect(detectLanguage('deploy.sh')).toBe('Shell')
    })
  })

  describe('generateMindMap', () => {
    const mockReport: ReviewReport = {
      schemaVersion: 1,
      reviewId: 'rev-test-1',
      revision: 'a1b2c3d',
      timestamp: new Date().toISOString(),
      projectName: 'test-project',
      projectRoot: '/test/path',
      status: 'completed',
      analysisMode: 'rules',
      providerInfo: { provider: 'none', model: 'none', isFallback: false },
      scanScope: {
        totalFilesScanned: 2,
        filesRead: ['src/api.ts', 'src/db.py'],
        filesIgnored: [],
        ignoreReasons: {},
        scanDurationMs: 15,
      },
      nodes: [
        {
          id: 'fn:src/api.ts:handleRequest',
          type: 'function',
          name: 'handleRequest',
          filePath: 'src/api.ts',
          startLine: 10,
          endLine: 25,
        },
        {
          id: 'fn:src/db.py:queryUser',
          type: 'function',
          name: 'queryUser',
          filePath: 'src/db.py',
          startLine: 5,
          endLine: 20,
        },
      ],
      edges: [
        {
          id: 'edge:1',
          sourceId: 'fn:src/api.ts:handleRequest',
          targetId: 'fn:src/db.py:queryUser',
          type: 'call',
          evidenceLine: 15,
          evidenceSnippet: 'queryUser()',
          resolved: 'resolved',
        },
      ],
      unresolvedCalls: [],
      findings: [
        {
          id: 'f-1',
          ruleId: 'SEC_SQL_INJECTION',
          category: 'security',
          severity: 'critical',
          title: 'SQL Injection Vulnerability',
          filePath: 'src/db.py',
          line: 12,
          evidence: "cursor.execute(f'SELECT * FROM users WHERE id = {uid}')",
          explanation: 'User input is concatenated into query without parameterization.',
          suggestion: 'Use parameterized queries: cursor.execute("SELECT * FROM users WHERE id = %s", (uid,))',
          source: 'rule',
          confidence: 'certain',
        },
      ],
    }

    it('generates mind map with root, directory branches, files and function call chains', () => {
      const lines = generateMindMap(mockReport, 80)
      const allText = lines.map((l) => l.text).join('\n')

      expect(allText).toContain('SƠ ĐỒ TƯ DUY KIẾN TRÚC MÃ NGUỒN (MIND MAP)')
      expect(allText).toContain('test-project')
      expect(allText).toContain('📁 src/')
      expect(allText).toContain('📄 api.ts (TypeScript)')
      expect(allText).toContain('📄 db.py (Python)')
      expect(allText).toContain('⚡ handleRequest() ──> queryUser')
      expect(allText).toContain('CRITICAL')
    })

    it('includes error annotations section beneath the mind map with file and language', () => {
      const lines = generateMindMap(mockReport, 80)
      const allText = lines.map((l) => l.text).join('\n')

      expect(allText).toContain('CHÚ THÍCH CHI TIẾT CÁC LỖI THEO TỪNG TỆP (ANNOTATIONS & ISSUES)')
      expect(allText).toContain('📁 src/db.py [Ngôn ngữ: Python] • 1 lỗi phát hiện:')
      expect(allText).toContain('🔴 [CRITICAL] SQL Injection Vulnerability (Dòng 12)')
      expect(allText).toContain('• Bằng chứng:')
      expect(allText).toContain('• Nguyên nhân: User input is concatenated')
      expect(allText).toContain('• Đề xuất sửa: Use parameterized queries')
    })

    it('prints clean status when 0 findings are present', () => {
      const cleanReport: ReviewReport = {
        ...mockReport,
        findings: [],
      }
      const lines = generateMindMap(cleanReport, 80)
      const allText = lines.map((l) => l.text).join('\n')

      expect(allText).toContain('Không phát hiện lỗi nào')
      expect(allText).toContain('Kiến trúc an toàn')
    })
  })
})
