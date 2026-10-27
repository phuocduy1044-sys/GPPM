import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolve } from 'path'
import {
  handleReviewCommand,
  handleGraphCommand,
  checkDirectoryCandidate,
  findFolderInText,
  extractContextFolder,
  parseReviewInput,
  matchesRequirement,
} from './reviewGraphHandler.js'
import { setCurrentReport, getCurrentReport } from '../../review/engine.js'
import type { ChatMessage } from '../types.js'
import type { Finding } from '../../review/types.js'

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

  describe('parseReviewInput and requirement matching', () => {
    it('parses bare /review, paths, and requirements', () => {
      expect(parseReviewInput('/review', cwdRoot)).toEqual({
        targetFolder: null,
        requirement: null,
        isExplicitProjectRoot: false,
      })

      expect(parseReviewInput('/review .', cwdRoot)).toEqual({
        targetFolder: cwdRoot,
        requirement: null,
        isExplicitProjectRoot: true,
      })

      expect(parseReviewInput('/review . kiểm tra bảo mật', cwdRoot)).toEqual({
        targetFolder: cwdRoot,
        requirement: 'kiểm tra bảo mật',
        isExplicitProjectRoot: true,
      })

      const withReq = parseReviewInput('/review examples/demo-project kiểm tra SQL injection', cwdRoot)
      expect(withReq.targetFolder).toBe(demoRoot)
      expect(withReq.requirement).toBe('kiểm tra SQL injection')

      const quoted = parseReviewInput('/review "examples/demo-project" tìm bug null', cwdRoot)
      expect(quoted.targetFolder).toBe(demoRoot)
      expect(quoted.requirement).toBe('tìm bug null')

      const reqOnly = parseReviewInput('/review kiểm tra an toàn bảo mật', cwdRoot)
      expect(reqOnly.targetFolder).toBeNull()
      expect(reqOnly.requirement).toBe('kiểm tra an toàn bảo mật')
    })

    it('matchesRequirement matches security, bug, and keyword requirements', () => {
      const secFinding: Finding = {
        id: 'f1',
        ruleId: 'SEC_SQL_INJECTION',
        category: 'security',
        severity: 'critical',
        title: 'SQL Injection detected',
        filePath: 'src/db.ts',
        line: 10,
        evidence: 'query = "SELECT * FROM users WHERE id = " + id',
        explanation: 'User input concatenation into SQL query',
        suggestion: 'Use parameterized queries',
        source: 'rule',
        confidence: 'certain',
      }

      expect(matchesRequirement(secFinding, 'kiểm tra bảo mật')).toBe(true)
      expect(matchesRequirement(secFinding, 'tìm lỗi SQL injection')).toBe(true)
      expect(matchesRequirement(secFinding, 'tối ưu hóa style code')).toBe(false)
    })
  })

  it('notifies when bare /review is called without any folder in context', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    // Clear previous report
    setCurrentReport(null as any)

    // Bare /review with no context messages and no agent history
    await handleReviewCommand('/review', cwdRoot, reportFn, noticeFn, [], [])

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('Chưa xác định được thư mục cần phân tích')
    expect(reports[0]).toContain('/review <thư-mục>')
    expect(reports[0]).toContain('/review .')

    // Verifies it did NOT scan the whole project automatically
    expect(getCurrentReport()).toBeNull()
  })

  it('runs bare /review and automatically reviews folder sent in context', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Ngữ cảnh: địa chỉ folder `examples/demo-project`' },
    ]

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

  it('runs /review with requirement and highlights matching findings', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    await handleReviewCommand('/review examples/demo-project kiểm tra bảo mật SQL injection', cwdRoot, reportFn, noticeFn)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('BÁO CÁO PHÂN TÍCH MÃ NGUỒN')
    expect(reports[0]).toContain('Yêu cầu trọng tâm')
    expect(reports[0]).toContain('kiểm tra bảo mật SQL injection')
    expect(reports[0]).toContain('Trực tiếp liên quan đến yêu cầu')

    const current = getCurrentReport()
    expect(current).toBeDefined()
    expect(current?.projectName).toBe('demo-project')
  })

  it('runs /review <requirement> without explicit folder, using context folder', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Đang làm việc tại thư mục `examples/demo-project`' },
    ]

    await handleReviewCommand('/review kiểm tra lỗi bug null', cwdRoot, reportFn, noticeFn, undefined, messages)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('BÁO CÁO PHÂN TÍCH MÃ NGUỒN')
    expect(reports[0]).toContain('demo-project')
    expect(reports[0]).toContain('kiểm tra lỗi bug null')
  })

  it('runs explicit /review . to force reviewing entire project', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    const messages: ChatMessage[] = [
      { role: 'user', content: 'Ngữ cảnh: địa chỉ folder `examples/demo-project`' },
    ]

    await handleReviewCommand('/review .', cwdRoot, reportFn, noticeFn, undefined, messages)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('BÁO CÁO PHÂN TÍCH MÃ NGUỒN')
    expect(reports[0]).not.toContain('tự động nhận từ ngữ cảnh hội thoại')
  })

  it('runs /graph with existing subfolder report from cwd and starts web reviewer', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    await handleReviewCommand('/review examples/demo-project', cwdRoot, reportFn, noticeFn)

    reports.length = 0
    await handleGraphCommand(cwdRoot, reportFn, noticeFn)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('Code Reviewer by Graph')
    expect(reports[0]).toContain('http://')
    expect(reports[0]).toContain('demo-project')
    expect(reports[0]).toContain('nodes')
    expect(reports[0]).toContain('edges')
  })
})
