#!/usr/bin/env node
import { render } from 'ink'
import { createElement } from 'react'
import { App, type AppProps } from './ui/App.js'
import { DISABLE as MOUSE_OFF } from './ui/mouse.js'
import { captureFrames } from './ui/selection.js'
import { cleanupSpill } from './tools/spill.js'
import { setProvider, listProviders, providerEntries, apiKeyFor, configError, type Provider } from './config.js'
import { parseHeadlessArgs, readStdin, runHeadless } from './headless.js'
import { settingsProblems, loadSettings } from './settings.js'

// Drop yesterday's spilled tool output before starting. Best-effort.
cleanupSpill()

const args = process.argv.slice(2)

const HELP = `viecodie — trợ lý lập trình AI chạy local trong terminal

Cách dùng
  viecodie                          mở phiên tương tác
  viecodie -p "<prompt>"            chạy một lượt rồi in câu trả lời
  cat file | viecodie -p "<task>"   nội dung đã pipe sẽ được đặt trước prompt

Phiên làm việc
  -c, --continue                tiếp tục phiên gần nhất
      --resume <id>             tiếp tục một phiên cụ thể

Chế độ headless (-p)
      --output-format <fmt>     text (mặc định) | json | stream-json
      --permission-mode <mode>  default | plan | acceptEdits | bypass (mặc định: bypass)
      --dangerously-skip-permissions  bí danh cũ của bypass
      --allowed-tools a,b,c     chỉ cho agent dùng các công cụ này
      --max-turns <n>           dừng sau n lượt dùng công cụ
      --model <name>            ghi đè model trong cấu hình

Dùng chung
      --provider <name>         dùng một backend đã cấu hình cho lần chạy này
  -v, --version                 in phiên bản
      --help                    hiển thị trợ giúp này

Lệnh con
  viecodie review [path]            phân tích mã nguồn 4 nhóm vấn đề (bug/security/style/maintainability)
      --output-format <fmt>     text (mặc định) | json
      --mode <rules|ai>         chế độ phân tích (mặc định: rules)
      --web                     mở giao diện Code Reviewer by Graph
      --port <n>                cổng web (mặc định 4747)
      --no-open                 chỉ in đường dẫn, không mở trình duyệt
  viecodie verify [path]            chạy kiểm thử xác minh độc lập
      --check "<cmd>"           lệnh kiểm thử cần chạy (ví dụ npm test)
      --output-format <fmt>     text (mặc định) | json
  viecodie fix [direction]          chạy test, sửa lỗi, lặp lại đến khi pass
      --check "<cmd>"           lệnh cần pass (mặc định: tự suy ra, ví dụ npm test)
      --max-rounds <n>          số lần thử sửa trước khi bỏ cuộc (mặc định 5)
      --max-turns <n>           số lượt dùng công cụ mỗi lần thử (mặc định 20)
      --max-stalls <n>          số lần thử liên tiếp không tiến triển trước khi dừng (mặc định 3)
      --check-timeout <sec>     dừng lệnh kiểm tra sau số giây này (mặc định 600)
      --output-format <fmt>     text (mặc định) | json
      --permission-mode <mode>  bypass (mặc định) | acceptEdits | default
  viecodie web                      mở viecodie trên trình duyệt (cũng dùng: viecodie --web)
      --port <n>                cổng để lắng nghe (mặc định 4747, nếu bị chiếm thì chọn cổng trống kế tiếp)
      --no-open                 chỉ in đường dẫn, không mở trình duyệt
  viecodie doctor                   chấm điểm các model đã cài bằng tác vụ thực tế
  viecodie provider [list|add|remove]  xem, thêm hoặc xoá provider
  viecodie update                   cài bản phát hành mới nhất
`

/**
 * `--provider` is read before anything dispatches, because every path below —
 * headless, the TUI, `doctor` — needs the backend already selected. `-P` is the
 * short form; `-p` belongs to --print, which is what a script reaches for far
 * more often than a one-off backend switch.
 */
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--provider' || args[i] === '-P') && i + 1 < args.length) {
    const p = args[i + 1] as Provider
    if (listProviders().includes(p)) setProvider(p)
  }
}

/** The first bare word that isn't the value of a flag — the subcommand, if any. */
function firstCommand(argv: string[]): string | undefined {
  const takesValue = new Set(['--provider', '-P', '--port', '--model', '--resume', '--output-format', '--permission-mode', '--max-turns', '--allowed-tools', '--allowedTools', '--check', '--mode', '--timeout'])
  for (let i = 0; i < argv.length; i++) {
    if (takesValue.has(argv[i])) { i++; continue }
    if (argv[i].startsWith('-')) continue
    return argv[i]
  }
  return undefined
}

if (args.includes('--help') || args.includes('-h')) {
  process.stdout.write(HELP)
  process.exit(0)
}

const cmd = firstCommand(args)

if (cmd === 'version' || args.includes('--version') || args.includes('-v')) {
  const { createRequire } = await import('module')
  const pkg = createRequire(import.meta.url)('../package.json') as { version: string }
  console.log(pkg.version)
  process.exit(0)
} else if (cmd === 'update' || args.includes('--update') || args.includes('-u')) {
  const { spawnSync } = await import('child_process')
  console.log('Updating viecodie-agent…')
  const r = spawnSync('npm', ['i', '-g', 'viecodie-agent@latest'], { stdio: 'inherit', shell: process.platform === 'win32' })
  process.exit(r.status ?? 1)
} else if (cmd === 'provider' || cmd === 'providers') {
  // Manage backends without launching the TUI, so a provider can be added from
  // a setup script or a Dockerfile.
  const { addByName, removeByName, describePresets } = await import('./llm/manage.js')
  const rest = args.slice(args.indexOf(cmd) + 1)
  const [verb, ...verbArgs] = rest
  if (verb === 'add') {
    const res = addByName(verbArgs)
    console[res.ok ? 'log' : 'error'](res.message)
    process.exit(res.ok ? 0 : 1)
  } else if (verb === 'remove' || verb === 'rm') {
    const res = removeByName(verbArgs[0])
    console[res.ok ? 'log' : 'error'](res.message)
    process.exit(res.ok ? 0 : 1)
  } else if (verb === 'list' || verb === undefined) {
    if (verbArgs.includes('--all')) {
      console.log('Providers you can add by name:\n' + describePresets())
    } else {
      const active = listProviders()
      const width = Math.max(...active.map((n) => n.length))
      for (const p of providerEntries()) {
        // A local server's key is optional, so an unset env var there is not a
        // problem worth flagging — only remote providers actually need one.
        const key = apiKeyFor(p.entry)
          ? 'key ✓'
          : p.kind === 'api' && p.entry.apiKeyEnv
            ? `needs $${p.entry.apiKeyEnv}`
            : '—'
        console.log(`  ${p.name.padEnd(width)}  ${p.kind.padEnd(5)}  ${p.entry.baseUrl}  ${key}`)
      }
      console.log('\nAdd one with: viecodie provider add <name> [apiKey]   (viecodie provider list --all to see names)')
    }
    process.exit(0)
  } else {
    console.error('usage: viecodie provider [list [--all] | add <name> [baseUrl] [apiKey] | remove <name>]')
    process.exit(1)
  }
} else if (cmd === 'review' || args.includes('review')) {
  const { runReviewCli } = await import('./review/cli.js')
  process.exit(await runReviewCli(args))
} else if (cmd === 'verify' || args.includes('verify')) {
  const { runVerifyCli } = await import('./review/cli.js')
  process.exit(await runVerifyCli(args))
} else if (cmd === 'fix') {
  const { parseFixArgs, runFix } = await import('./fix/run.js')
  const parsed = parseFixArgs(args.slice(args.indexOf(cmd) + 1))
  if (!parsed.options) {
    console.error(`viecodie: ${parsed.error}`)
    process.exit(2)
  }
  process.exit(await runFix(parsed.options))
} else if (cmd === 'web' || args.includes('--web')) {
  const { runWeb } = await import('./web/run.js')
  process.exit(await runWeb(args))
} else if (cmd === 'doctor' || cmd === 'eval') {
  const rest = args.filter((a) => a !== cmd)
  const { runEval } = await import('../eval/run.js')
  process.exit(await runEval(rest))
} else {
  const headless = parseHeadlessArgs(args)
  if (headless.error) {
    console.error(`viecodie: ${headless.error}`)
    process.exit(2)
  }

  if (headless.options) {
    // Piped input becomes context above the prompt rather than replacing it, so
    // `git diff | viecodie -p "review this"` has both the diff and the instruction.
    // With no prompt flag argument at all, the piped text IS the prompt.
    const piped = (await readStdin()).trim()
    const opts = headless.options
    const prompt = piped
      ? opts.prompt
        ? `${opts.prompt}\n\n<stdin>\n${piped}\n</stdin>`
        : piped
      : opts.prompt
    if (!prompt.trim()) {
      console.error('viecodie: -p needs a prompt, as an argument or on stdin')
      process.exit(2)
    }
    process.exit(await runHeadless({ ...opts, prompt }))
  }

  // Warn about a malformed config BEFORE Ink mounts — once the TUI owns the
  // terminal, a raw stderr write gets scrambled or painted over.
  const cfgErr = configError()
  if (cfgErr) console.error(cfgErr)
  // Before the first loadSettings(), which caches: a yes here has to be seen by it.
  const { confirmTrust, untrustedNotice } = await import('./trust.js')
  if (!(await confirmTrust())) {
    const notice = untrustedNotice()
    if (notice) console.error(notice)
  }
  loadSettings()
  for (const problem of settingsProblems()) {
    console.error(`viecodie: ignoring ${problem.path} (${problem.message})`)
  }

  const resumeIdx = args.indexOf('--resume')
  const resumeId = resumeIdx !== -1 ? args[resumeIdx + 1] : undefined
  const continueLast = args.includes('--continue') || args.includes('-c')

  // Restore the terminal tab title on any exit path (Ink's unmount cleanup
  // can be skipped on a hard signal).
  // Mouse reporting gets the same treatment: a terminal left in click/wheel
  // tracking mode swallows selection in whatever shell inherits it.
  process.on('exit', () => {
    if (process.stdout.isTTY) process.stdout.write(`\x1b]2;\x07${MOUSE_OFF}`)
  })
  // Ink renders through a recording wrapper so a mouse drag can be turned back
  // into the text on screen (selection.ts).
  if (process.stdin.isTTY && typeof process.stdin.setEncoding === 'function') {
    process.stdin.setEncoding('utf8')
  }
  const stdout = process.stdout.isTTY ? captureFrames(process.stdout) : process.stdout
  render(createElement(App, { resumeId, continueLast } satisfies AppProps), { stdout })
}
