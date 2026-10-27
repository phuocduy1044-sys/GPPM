import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolve } from 'path'
import {
  handleReviewCommand,
  handleGraphCommand,
  checkDirectoryCandidate,
  findFolderInText,
  extractContextFolder,
} from './reviewGraphHandler.js'
import { setCurrentReport, getCurrentReport } from '../../review/engine.js'
import type { ChatMessage } from '../types.js'

describe('reviewGraphHandler', () => {
  const cwdRoot = resolve('.')
  const demoRoot = resolve('examples/demo-project')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('folder detection helpers', () => {
    it('checkDirectoryCandidate detects valid directories and ignores invalid/cwd/urls', () => {
      // Existing directory
      const valid = checkDirectoryCandidate('examples/demo-project', cwdRoot)
      expect(valid).toBe(demoRoot)

      // Strips quotes and trailing punctuation
      expect(checkDirectoryCandidate('"examples/demo-project",', cwdRoot)).toBe(demoRoot)
      expect(checkDirectoryCandidate("`examples/demo-project`.", cwdRoot)).toBe(demoRoot)
      expect(checkDirectoryCandidate('@examples/demo-project', cwdRoot)).toBe(demoRoot)

      // Rejects cwd itself
      expect(checkDirectoryCandidate('.', cwdRoot)).toBeNull()
      expect(checkDirectoryCandidate(cwdRoot, cwdRoot)).toBeNull()

      // Rejects non-existent path
      expect(checkDirectoryCandidate('non/existent/path/never', cwdRoot)).toBeNull()

      // Rejects URLs
      expect(checkDirectoryCandidate('https://github.com', cwdRoot)).toBeNull()

      // Rejects node_modules
      expect(checkDirectoryCandidate('node_modules', cwdRoot)).toBeNull()
    })

    it('findFolderInText extracts folder from various natural language formats', () => {
      expect(findFolderInText('thư mục examples/demo-project', cwdRoot)).toBe(demoRoot)
      expect(findFolderInText('folder: "examples/demo-project"', cwdRoot)).toBe(demoRoot)
      expect(findFolderInText('địa chỉ folder examples/demo-project', cwdRoot)).toBe(demoRoot)
      expect(findFolderInText('hãy xem @examples/demo-project giúp tôi', cwdRoot)).toBe(demoRoot)
      expect(findFolderInText('kiểm tra `./examples/demo-project/`', cwdRoot)).toBe(demoRoot)
      expect(findFolderInText('xem file mã nguồn bình thường không có đường dẫn', cwdRoot)).toBeNull()
    })

    it('extractContextFolder picks up directory from recent messages or tool uses', () => {
      const messages: ChatMessage[] = [
        { role: 'user', content: 'Xin chào' },
        { role: 'user', content: 'Đây là địa chỉ folder: examples/demo-project cần phân tích' },
      ]
      const extracted = extractContextFolder(cwdRoot, messages)
      expect(extracted).toBe(demoRoot)

      const toolMessages: ChatMessage[] = [
        {
          role: 'assistant',
          content: 'Đang đọc thư mục',
          tool_uses: [{ id: '1', name: 'read_dir', input: { dir: 'examples/demo-project' } }],
        },
      ]
      expect(extractContextFolder(cwdRoot, toolMessages)).toBe(demoRoot)
    })
  })

  it('notifies when /graph is called without any prior review', async () => {
    // Set a report pointing to a different non-matching path
    setCurrentReport({
      schemaVersion: 1,
      reviewId: 'test-review-id',
      revision: 'dummy',
      timestamp: new Date().toISOString(),
      projectName: 'other',
      projectRoot: '/some/other/path/never/matched',
      status: 'completed',
      analysisMode: 'rules',
      providerInfo: { provider: 'none', model: 'none', isFallback: false },
      scanScope: { totalFilesScanned: 0, filesRead: [], filesIgnored: [], ignoreReasons: {}, scanDurationMs: 0 },
      nodes: [],
      edges: [],
      unresolvedCalls: [],
      findings: [],
    })

    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    await handleGraphCommand(demoRoot, reportFn, noticeFn)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('Chưa có kết quả review cho dự án hiện tại')
    expect(reports[0]).toContain('/review')
  })

  it('runs /review with explicit path, saves report, and formats markdown summary', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    await handleReviewCommand('/review examples/demo-project', cwdRoot, reportFn, noticeFn)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('BÁO CÁO PHÂN TÍCH MÃ NGUỒN')
    expect(reports[0]).toContain('/graph')

    const current = getCurrentReport()
    expect(current).toBeDefined()
    expect(current?.projectName).toBe('demo-project')
    expect(current?.findings.length).toBeGreaterThanOrEqual(2)
  })

  it('runs bare /review and automatically reviews folder sent in context', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Ngữ cảnh: địa chỉ folder `examples/demo-project`' },
    ]

    // Clear previous report
    setCurrentReport(null as any)

    await handleReviewCommand('/review', cwdRoot, reportFn, noticeFn, undefined, messages)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('BÁO CÁO PHÂN TÍCH MÃ NGUỒN')
    expect(reports[0]).toContain('demo-project')
    expect(reports[0]).toContain('tự động nhận từ ngữ cảnh hội thoại')

    const current = getCurrentReport()
    expect(current).toBeDefined()
    expect(current?.projectName).toBe('demo-project')
    expect(current?.projectRoot).toBe(demoRoot)
  })

  it('runs explicit /review . to force reviewing entire project even if context has a folder', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Ngữ cảnh: địa chỉ folder `examples/demo-project`' },
    ]

    await handleReviewCommand('/review .', cwdRoot, reportFn, noticeFn, undefined, messages)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('BÁO CÁO PHÂN TÍCH MÃ NGUỒN')
    // Should NOT contain the context auto-pick note
    expect(reports[0]).not.toContain('tự động nhận từ ngữ cảnh hội thoại')
  })

  it('runs /graph with existing subfolder report from cwd and starts web reviewer', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    // Ensure we have a report for demo-project
    await handleReviewCommand('/review examples/demo-project', cwdRoot, reportFn, noticeFn)

    reports.length = 0
    // Run /graph from project cwdRoot where projectRoot is a subfolder
    await handleGraphCommand(cwdRoot, reportFn, noticeFn)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('Code Reviewer by Graph')
    expect(reports[0]).toContain('http://')
    expect(reports[0]).toContain('demo-project')
    expect(reports[0]).toContain('nodes')
    expect(reports[0]).toContain('edges')
  })
})
