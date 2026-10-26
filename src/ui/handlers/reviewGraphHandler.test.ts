import { describe, it, expect, vi, beforeEach } from 'vitest'
import { resolve } from 'path'
import { handleReviewCommand, handleGraphCommand } from './reviewGraphHandler.js'
import { setCurrentReport, getCurrentReport } from '../../review/engine.js'

describe('reviewGraphHandler', () => {
  const demoRoot = resolve('examples/demo-project')

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('notifies when /graph is called without any prior review', async () => {
    // Clear any previous report
    const { setCurrentReport } = await import('../../review/engine.js')
    // Set a report pointing to a different non-matching path
    setCurrentReport({
      schemaVersion: 1,
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

  it('runs /review, saves report, and formats markdown summary', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    await handleReviewCommand('/review', demoRoot, reportFn, noticeFn)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('BÁO CÁO PHÂN TÍCH MÃ NGUỒN')
    expect(reports[0]).toContain('/graph')

    const current = getCurrentReport()
    expect(current).toBeDefined()
    expect(current?.projectName).toBe('demo-project')
    expect(current?.findings.length).toBeGreaterThanOrEqual(2)
  })

  it('runs /graph with existing report, starts/reuses server and prints clickable link', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()

    await handleGraphCommand(demoRoot, reportFn, noticeFn)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('Code Reviewer by Graph')
    expect(reports[0]).toContain('http://')
    expect(reports[0]).toContain('demo-project')
    expect(reports[0]).toContain('nodes')
    expect(reports[0]).toContain('edges')
  })
})
