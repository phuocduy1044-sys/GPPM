import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { resolve, join } from 'path'
import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs'
import { tmpdir } from 'os'
import {
  handleReviewCommand,
  handleGraphCommand,
} from './reviewGraphHandler.js'
import { getCurrentReport, setCurrentReport, clearReportCache } from '../../review/engine.js'

describe('Review & Graph Session Linkage & Multi-Session Verification', () => {
  const testBase = join(tmpdir(), `viecodie-test-${Date.now()}`)
  const dirA = join(testBase, 'projectA')
  const dirB = join(testBase, 'projectB')
  const cwdRoot = resolve('.')

  beforeEach(() => {
    vi.clearAllMocks()
    clearReportCache()

    // Create outside project A
    mkdirSync(join(dirA, 'src'), { recursive: true })
    writeFileSync(
      join(dirA, 'src', 'index.js'),
      'function handleA(user) {\n  var secret = "sk_1234567890abcdef";\n  return user;\n}\n',
      'utf8'
    )

    // Create outside project B
    mkdirSync(join(dirB, 'src'), { recursive: true })
    writeFileSync(
      join(dirB, 'src', 'main.js'),
      'function handleB(query) {\n  const res = eval(query);\n  return res;\n}\n',
      'utf8'
    )
  })

  afterEach(() => {
    clearReportCache()
    try {
      rmSync(testBase, { recursive: true, force: true })
    } catch {}
  })

  it('1. /review <A> (outside cwd) -> /graph shows A immediately without re-calling AI', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()
    const session1 = 'session-123'

    // Step 1: Run /review on external folder A
    await handleReviewCommand(`/review "${dirA}"`, cwdRoot, reportFn, noticeFn, undefined, undefined, session1)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('BÁO CÁO PHÂN TÍCH MÃ NGUỒN')
    expect(reports[0]).toContain('projectA')

    const repA = getCurrentReport(session1)
    expect(repA).toBeDefined()
    expect(repA?.projectName).toBe('projectA')
    expect(repA?.projectRoot).toBe(resolve(dirA))
    expect(repA?.reviewId).toBeDefined()
    expect(repA?.revision).toBeDefined()
    expect(repA?.sessionId).toBe(session1)

    // Step 2: Run /graph in same session -> immediately shows A, does not require re-reviewing
    reports.length = 0
    await handleGraphCommand(cwdRoot, reportFn, noticeFn, session1)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('Code Reviewer by Graph')
    expect(reports[0]).toContain('projectA')
    expect(reports[0]).toContain(resolve(dirA))
    expect(reports[0]).not.toContain('Chưa có kết quả review')
    expect(reports[0]).toContain(`session=${session1}`)
  })

  it('2. /review <A> -> /graph shows A; then /review <B> -> /graph immediately shows B', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()
    const sessionX = 'session-sequential'

    // Run review on A
    await handleReviewCommand(`/review "${dirA}"`, cwdRoot, reportFn, noticeFn, undefined, undefined, sessionX)
    reports.length = 0

    // Graph shows A
    await handleGraphCommand(cwdRoot, reportFn, noticeFn, sessionX)
    expect(reports[0]).toContain('projectA')
    expect(reports[0]).toContain(resolve(dirA))
    reports.length = 0

    // Now run review on B
    await handleReviewCommand(`/review "${dirB}"`, cwdRoot, reportFn, noticeFn, undefined, undefined, sessionX)
    expect(reports[0]).toContain('projectB')
    reports.length = 0

    // Graph now immediately displays B
    await handleGraphCommand(cwdRoot, reportFn, noticeFn, sessionX)
    expect(reports[0]).toContain('projectB')
    expect(reports[0]).toContain(resolve(dirB))
    expect(reports[0]).not.toContain('projectA')
  })

  it('3. Multiple CLI sessions running concurrently maintain their own review targets', async () => {
    const repFn1: string[] = []
    const repFn2: string[] = []
    const noticeFn = vi.fn()

    const sessionAlpha = 'session-alpha'
    const sessionBeta = 'session-beta'

    // Session Alpha reviews A
    await handleReviewCommand(`/review "${dirA}"`, cwdRoot, (c) => repFn1.push(c), noticeFn, undefined, undefined, sessionAlpha)

    // Session Beta reviews B
    await handleReviewCommand(`/review "${dirB}"`, cwdRoot, (c) => repFn2.push(c), noticeFn, undefined, undefined, sessionBeta)

    // Check session isolation in storage
    const reportAlpha = getCurrentReport(sessionAlpha)
    const reportBeta = getCurrentReport(sessionBeta)

    expect(reportAlpha?.projectName).toBe('projectA')
    expect(reportBeta?.projectName).toBe('projectB')

    // Session Alpha graph shows A
    repFn1.length = 0
    await handleGraphCommand(cwdRoot, (c) => repFn1.push(c), noticeFn, sessionAlpha)
    expect(repFn1[0]).toContain('projectA')
    expect(repFn1[0]).toContain(resolve(dirA))
    expect(repFn1[0]).not.toContain('projectB')

    // Session Beta graph shows B
    repFn2.length = 0
    await handleGraphCommand(cwdRoot, (c) => repFn2.push(c), noticeFn, sessionBeta)
    expect(repFn2[0]).toContain('projectB')
    expect(repFn2[0]).toContain(resolve(dirB))
    expect(repFn2[0]).not.toContain('projectA')
  })

  it('4. Running bare /review preserves previous target A without guessing from chat tokens', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()
    const sessionY = 'session-context-preserve'

    // First review A
    await handleReviewCommand(`/review "${dirA}"`, cwdRoot, reportFn, noticeFn, undefined, undefined, sessionY)
    reports.length = 0

    // Chat history mentions another directory
    const chatMessages = [
      { role: 'user' as const, content: 'Kiểm tra thư mục examples/demo-project nhé' },
    ]

    // Bare /review in the same session should keep target A
    await handleReviewCommand('/review', cwdRoot, reportFn, noticeFn, undefined, chatMessages, sessionY)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('projectA')
    expect(reports[0]).not.toContain('demo-project')
  })

  it('5. When code at A changes, /graph still shows existing report with warning and re-review option', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()
    const sessionZ = 'session-outdated-test'

    // Review A
    await handleReviewCommand(`/review "${dirA}"`, cwdRoot, reportFn, noticeFn, undefined, undefined, sessionZ)
    reports.length = 0

    // Modify file in A
    writeFileSync(
      join(dirA, 'src', 'index.js'),
      'function handleA(user) {\n  const secret = "MODIFIED_CODE_CONTENT";\n  return user;\n}\n',
      'utf8'
    )

    // Call /graph
    await handleGraphCommand(cwdRoot, reportFn, noticeFn, sessionZ)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('Code Reviewer by Graph')
    expect(reports[0]).toContain('projectA')
    // Outdated warning displayed with command option
    expect(reports[0]).toContain('Mã nguồn tại')
    expect(reports[0]).toContain('đã có thay đổi so với thời điểm review này')
    expect(reports[0]).toContain(`/review "${resolve(dirA)}"`)
  })

  it('6. Only reports "chưa có kết quả review" when really no review exists for that session', async () => {
    const reports: string[] = []
    const reportFn = (c: string) => reports.push(c)
    const noticeFn = vi.fn()
    const emptySession = 'session-empty-999'

    await handleGraphCommand(cwdRoot, reportFn, noticeFn, emptySession)

    expect(reports.length).toBe(1)
    expect(reports[0]).toContain('Chưa có kết quả review cho phiên làm việc hiện tại')
    expect(reports[0]).toContain('/review <thư-mục>')
  })
})
