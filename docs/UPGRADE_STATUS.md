# VIECODIE — Trạng thái nâng cấp

## T00 — DONE: baseline và backlog có bằng chứng

Cập nhật: 27/10/2026 (Asia/Saigon).

Đây là kiểm tra trên bản clone GitHub, không phải truy cập thư mục Windows của người dùng. T00 bổ sung tài liệu và script chẩn đoán; chưa sửa hành vi sản phẩm.

### Phiên bản và môi trường

| Mục | Kết quả |
|---|---|
| Repo | https://github.com/phuocduy1044-sys/GPPM |
| HEAD được kiểm tra | `1f5c9c7dc0bb364aed18407c22866229d6e7e53d` |
| Remote main | Đã kiểm tra lại bằng `git ls-remote`; cùng HEAD trên |
| Branch làm việc T00 | `codex/t00-baseline` |
| Working tree trước T00 | Sạch |
| Môi trường | Linux, Node 24.22.1, npm 11.9.0 |
| Docker | Không tìm thấy executable; không thể kiểm tra daemon/container ở đây |
| Windows | Chưa chạy trên Windows |
| DeepSeek/Ollama live | Không gọi trong T00 |
| UI | Chạy callback thật với dữ liệu giả; chưa kiểm tra rendering/thao tác browser |
| Remote mutation | Không push, publish hay deploy |

Không phát hiện AGENTS.md trong repo hoặc các thư mục cha đã kiểm tra.

### Baseline đã có và được tái sử dụng

Mã sản phẩm và lockfile không đổi so với lần kiểm tra ngay trước T00. Các kết quả sau được đọc lại từ log/JSON đã lưu của cùng HEAD; không chạy lại toàn bộ chỉ để có số đếm mới.

| Kiểm tra | Lệnh đã chạy | Kết quả |
|---|---|---|
| Cài dependency | `npm ci --ignore-scripts --no-audit --no-fund` | Đạt; chưa xác minh lifecycle scripts bị bỏ qua |
| Typecheck | `npm run typecheck` | Exit 0, CLI và Web |
| Build | `npm run build` | Exit 0; có cảnh báo bundle Web >500 KB |
| Test toàn repo | `npm test -- --reporter=json --outputFile=<path>` | 754 passed, 0 failed, 0 skipped; 54 file |
| CLI review demo | `node dist/cli.js review examples/demo-project --mode rules --output-format json` | 5 file, 14 nodes, 7 edges, 8 findings; exit 1 do có finding mức cao, đúng semantics CLI |

754 test của repo không tương đương 754 ca benchmark đánh giá độ chính xác reviewer. File `src/review/review.test.ts` hiện có 2 ca trực tiếp; còn các test khác kiểm tra nhiều phần agent, UI helpers, runner và hạ tầng.

### Probe chẩn đoán chạy trong T00

```bash
node --import tsx scripts/audit-review-baseline.mts
```

- Kết quả lưu trong `docs/audit/T00-probes.json`.
- 20 quan sát: 18 trường hợp tái hiện bằng thực thi, 2 trường hợp kiểm tra nguồn/AST.
- Các callback Web được trích từ code thật rồi transpile và chạy với fetch/state giả. Đây là kiểm tra logic callback, không phải E2E trình duyệt hay kiểm tra bố cục.
- Chỉ dùng file dummy trong thư mục tạm. Các probe đường dẫn đọc marker giả ngoài dummy project, không đọc dữ liệu riêng.
- Script exit 0 nghĩa là bộ chẩn đoán chạy xong; các lỗi sản phẩm vẫn được ghi `reproduced`. Không dùng script này làm quality gate “xanh”.

| Nhóm audit | Trạng thái | Bằng chứng / giới hạn | Sửa tại |
|---|---|---|---|
| 01 — Apply lỗi vẫn thành công | reproduced | HTTP 500 và network exception đều làm state finding thành applied qua callback thật | T01 |
| 01b — Applied dùng state cục bộ trong RightPanel | source confirmed; browser blocked | `handleApply` đặt true sau callback, state không khóa theo finding; chuyển issue chưa tái hiện qua browser | T01 |
| 02 — Câu gợi ý bị biến thành patch | reproduced | Report không có patch nhưng adapter vẫn tạo replacement từ văn bản suggestion | T01 |
| 03 — Patch rỗng báo success | reproduced | SQL trực tiếp được phát hiện, patch.files rỗng, Apply trả success và revision mới | T01 |
| 04 — Test/count sai | reproduced | Lệnh không chạy test báo passed; TAP 1 pass/2 fail bị đếm 1 pass/1 fail; UI tự thêm 1 test | T01/T03 |
| 05 — Source đọc sibling ngoài root | reproduced | Authenticated API đọc marker từ `../project-sibling/public-dummy.js` | T02 |
| 06 — Symlink/session | reproduced | Scanner đọc file theo link ngoài root; static GET cấp cookie dùng được với API health | T02 |
| 07 — Rule/diagnostic yếu | reproduced | Null false positive trên typed input; SQL qua biến bị bỏ sót; parser có lỗi nhưng findings trống | T08; diagnostics phối hợp T06 |
| 08 — Graph sai | reproduced | Import alias unresolved; object method nối nhầm hàm độc lập; hai class cùng method tạo ID trùng | T06 |
| 09 — File/revision bị mất | reproduced | `a/index.ts` và `b/index.ts` còn một entry; hash revision biến thành số 1 | T01 giữ hash; T06 giữ full path |
| 10 — Context AI không dùng graph | fixed (T07) | Call Graph Context Selector ưu tiên seed findings & caller/callee neighborhood; token budget & provenance; 6/6 tests passed | T07 |

Chưa có bằng chứng lỗi nào trong danh sách đã được sửa ở remote main. Không suy kết quả của các probe này thành tỷ lệ precision/recall của toàn reviewer.

### Quyết định kỹ thuật đã chốt sau khi đọc hai runner

`src/review/verify.ts` và `src/fix/run.ts` đều chạy command trên host và kế thừa môi trường. Runner fix có kill process tree và giới hạn vòng sửa tốt hơn, nhưng không phải sandbox. Các snapshot của fix loop là undo theo round, chưa đại diện cho bộ source/tests/config bất biến để kiểm chứng.

T03 tạo service runner dùng chung, đề xuất vị trí `src/runner/`:

1. Adapter khám phá test/config không thực thi code.
2. Backend container nhận snapshot và manifest đã validate, không nhận root tùy ý từ Web.
3. Adapter Node test/Vitest xuất kết quả có cấu trúc; command check và test suite là hai loại kết quả khác nhau.
4. `review verify` và `fix` đều gọi service này; không giữ host fallback cho code cần cô lập.
5. T04 quản lý snapshot/candidate/verification; fix loop chỉ điều phối đề xuất và quyết định giữ/hoàn tác dựa trên cùng bằng chứng.

Giữ TypeScript/Node + React + graph SVG; không đổi framework, database hoặc thêm ngôn ngữ mới.

### Contract và cache — kế hoạch sửa, chưa triển khai

- T01: dùng patch record phía server; request Apply nhận `patchId`, `reviewId`, hash gốc và confirm boolean; response phân biệt applied/no_changes/unsupported/stale/failed. Render diff từ record đó; không tạo lại patch khi Apply.
- Kiểu dữ liệu dùng chung từ contracts, runtime schema validation cho request/response. Giảm adapter `any`; không nhân đôi contract chỉ để vừa Web cũ.
- Verification phân biệt not_run/running/passed/failed/error/timed_out/cancelled/no_tests/stale/unsupported; chỉ số chưa có giữ null/undefined.
- T02: project/session/report đều có identity; source đọc manifest/snapshot đúng revision. Cache không dùng một `latest-review.json` toàn cục để Apply bất kỳ project nào.
- T04: contract v2 hoặc version tiếp theo tương đương bổ sung sourceHash, testsHash, patchHash, config/dependency hashes, runtime fingerprint, snapshot IDs và apply/undo records.
- Cache v1 không được tái sử dụng làm bằng chứng Apply/Verify v2. Có thể đọc lịch sử ở chế độ read-only với nhãn chưa xác minh; yêu cầu rescan/re-verify để thao tác. Không tự migrate bằng cách điền hash giả.
- Không thay Git commit SHA cho content hash; không gán revision snapshot cũ lên nội dung file vừa đọc ngoài snapshot.

### File dự kiến theo từng task

| Task | Phạm vi sửa chính |
|---|---|
| T01 | `contracts/review-v1.ts` hoặc contract version mới; `src/review/patch.ts`; `src/web/server.ts`; Web reviewTypes/ReviewerLayout/RightPanel/TestDrawer; test API và component |
| T02 | scanner, engine/cache, helper path containment, server/session, lọc secret trước AI/log |
| T03 | service `src/runner/`; review/verify, fix/run; runner container/adapter/report parsing và integration tests |
| T04 | snapshot/candidate/patch/apply/undo services; contract/manifest; API và UI verification |
| T05 | test bundle/import endpoints và Test Drawer; kết nối fix loop với runner chung |
| T06 | review/ast, TypeScript Program/TypeChecker, full-path adapter, graph UI/fixtures |
| T07 | review/ai và context selector/validator; usage/provenance/cancellation |
| T08 | review/rules, lint/type adapters, benchmark dataset/labels/runner/report |
| T09 | README, ORIGIN, THIRD_PARTY/SBOM, POF-AUDIT/EVIDENCE/INSTALL, workflows |
| T10 | install/pack/E2E smoke, evidence và tài liệu demo/handover |

### Ước lượng và giới hạn

Ước lượng sơ bộ công thực hiện + kiểm chứng cho một người có AI hỗ trợ, không phải thời gian chờ một lần sinh code. Chưa có số đo tốc độ của AGY; phải cập nhật sau T01. Không bao gồm chờ quyền tài khoản hoặc sửa môi trường máy người dùng.

| Task | Khoảng công dự kiến | Điều kiện |
|---|---:|---|
| T01 | 2–4 giờ | Có harness component/API |
| T02 | 3–5 giờ | Kiểm tra cả Windows path/junction ở máy phù hợp |
| T03 | 4–8 giờ | Có Docker daemon và runner image |
| T04 | 4–8 giờ | T03 thực sự chạy được |
| T05 | 2–4 giờ | Chỉ file test lẻ/bundle không ZIP |
| T06 | 4–8 giờ | JS/TS có phạm vi resolution được công bố |
| T07 | 2–4 giờ | Fixture công khai và API/provider sẵn sàng |
| T08 | 4–8 giờ | Có người duyệt nhãn/holdout |
| T09 | 2–4 giờ | Có thể đọc logs remote và bảng PoF BTC |
| T10 | 2–4 giờ | Có môi trường demo, Windows/Linux tương ứng |

Tổng khoảng 29–57 giờ công; không hứa một ngày cho toàn bộ. Đây là phạm vi mục tiêu đầy đủ; nếu thiếu thời gian, ưu tiên P0 và bằng chứng thật, hoãn ZIP, mở rộng rule/ngôn ngữ, mutation testing và UI phụ. Không cắt sandbox hoặc sửa báo cáo cho đẹp để kịp hạn.

### Blocker và việc chưa được xác minh

| Mục | Trạng thái | Hệ quả |
|---|---|---|
| Docker trong môi trường audit | BLOCKED | T03 chưa thể nghiệm thu container thật ở đây; cần môi trường có Docker |
| Windows/junction/installer | UNVERIFIED | Probe Linux không thay cho kiểm thử Windows |
| Browser E2E | UNVERIFIED | Callback đã tái hiện logic, chưa chứng minh tương tác/hiển thị |
| Live DeepSeek/Ollama | UNVERIFIED | T07 cần smoke test công khai được cấu hình đúng |
| Bảng PoF cụ thể của BTC | PENDING | Không khẳng định PoF 0–15 hoặc nhận đủ điểm |
| Pages/release settings | PENDING | Lần audit trước thấy failure; T09 phải đọc log mới nhất, chưa xác định nguyên nhân |

### Trạng thái toàn kế hoạch

| Task | Trạng thái |
|---|---|
| T00 | DONE — baseline, 20 quan sát, backlog, contract/cache plan và ước lượng |
| T01 | DONE — patch record thật phía server, UI render diff chuẩn, Apply an toàn, loại bỏ số liệu giả & regression tests |
| T02 | DONE — scanner symlink/junction, cache/project identity, path containment helper, server session isolation, lọc secret trước AI/log |
| T03 | DONE — service src/runner/, container/process backends, discovery tĩnh không eval, test output adapters & integration tests |
| T04 | DONE — snapshot/candidate/patch/apply/undo services; contract/manifest; API và UI verification |
| T05 | DONE — test bundle/import endpoints và Test Drawer; kết nối fix loop với runner chung |
| T06 | DONE — review/ast, TypeScript Program/TypeChecker, full-path adapter, graph UI/fixtures |
| T07 | DONE — review/ai và context selector/validator; usage/provenance/cancellation |
| T08–T10 | PENDING |

## T01 — DONE: Patch record thật phía server, UI render đúng diff, Apply an toàn, loại bỏ số liệu giả & Regression Tests

Hoàn tất: 27/10/2026.

### Kết quả triển khai T01

1. **Patch record thật phía server**:
   - `src/review/engine.ts` và `src/review/patch.ts` tạo bản ghi `report.patches` có cấu trúc `Record<string, Patch>`, định danh bằng `patchId` với đầy đủ `oldHash`, `newHash`, `diff` và `newContent`.
   - Các finding có thể vá tự động được gán `patchId`, `canPatch: true` và `patchPreview` thật.

2. **UI render đúng diff, loại bỏ câu gợi ý biến thành patch**:
   - `web/src/components/reviewer/ReviewerLayout.tsx` loại bỏ hoàn toàn việc dùng văn bản `f.suggestion` (tiếng Việt) làm code replacement.
   - Diff trong tab Fix hiển thị trung thực từ `f.patchPreview` do server cung cấp. Nếu lỗi không có bản vá tự động, `patch` là `undefined` và nút Apply Patch được ẩn hoàn toàn.

3. **Apply đúng patchId, reviewId và confirm boolean**:
   - Endpoint `POST /api/review/apply` nhận `{ patchId, reviewId, baseRevision, confirm }`.
   - Phân biệt rõ các trạng thái: `applied`, `no_changes`, `unsupported`, `stale`, `failed`.
   - Áp dụng trực tiếp vào tệp nguồn trên ổ đĩa (`targetRoot = current.projectRoot || agent.cwd`), không tạo lại patch thừa khi apply nếu đã có trong record.

4. **Không đánh dấu thành công khi API lỗi, khóa state theo finding**:
   - Loại bỏ cơ chế optimistic update khi gặp lỗi.
   - Trong `RightPanel.tsx`, trạng thái `isApplied` được quản lý qua `appliedFindingIds: Set<string>`, không bị nhảy trạng thái khi chuyển qua lại giữa các finding. Khi gặp lỗi, thông báo lỗi được hiển thị trực tiếp.

5. **Patch rỗng / không hỗ trợ không Apply**:
   - Nếu `patch.files` rỗng, `applyPatch` trả về `{ success: false, status: 'no_changes' }`, không tăng revision và không sửa tệp.

6. **Loại bỏ số test/score/revision giả**:
   - `revision`: Giữ nguyên hash string của revision (không ép kiểu thành số 1).
   - `testResult`: Loại bỏ các giá trị mặc định giả như `totalTests ?? 1`, `failedTests ?? 1`, `score: '100/100'`. Các chỉ số chưa có giữ nguyên `null` / `undefined`.
   - `VerificationStatus`: Mở rộng đầy đủ (`not_run`, `running`, `passed`, `failed`, `error`, `timed_out`, `cancelled`, `no_tests`, `stale`, `unsupported`).
   - Lệnh không chạy test (hoặc không tìm thấy test nào) trả về `status: 'no_tests'`, không tự nhận là `'passed'`.
   - Sửa bộ phân tích TAP trong `parseTestsSummary` để đọc đúng số đếm pass/fail (ví dụ TAP 1 pass/2 fail được đếm đúng 1 pass, 2 fail, tổng 3).

7. **Kiểm chứng & Regression Tests**:
   - Đã thêm file test hồi quy `src/review/t01Regression.test.ts` bao quát đầy đủ các Probe 01, 02, 03, 04, 09: **6/6 tests passed**.
   - Toàn bộ test suite: **57 test files, 764 tests passed**.
   - Kiểm tra kiểu dữ liệu: `npm run typecheck` exit 0.
   - Biên dịch ứng dụng: `npm run build` exit 0.

## T02 — DONE: Scanner, Engine/Cache Isolation, Path Containment Helper, Server/Session Security, và Lọc Secret trước AI/Log

Hoàn tất: 27/10/2026.

### Kết quả triển khai T02

1. **Helper Path Containment (`src/tools/paths.ts`)**:
   - Bổ sung `confineToRoot(targetPath, rootDir)`, `isPathContained(targetPath, rootDir)` và chuẩn hóa `isUnder(parent, child)` xử lý đa nền tảng (cả Windows case-insensitive).
   - Ngăn chặn triệt để lỗ hổng Probe 05: chặn các đường dẫn leo thang `..`, chặn tấn công prefix trùng tên thư mục anh em (sibling folders như `project-sibling`), chặn symlink hoặc junction nhảy ra ngoài root.

2. **Server & Session Security (`src/web/server.ts`)**:
   - Khắc phục Probe 05 tại endpoint `/api/review/source`: ép buộc kiểm tra `confineToRoot` trước khi đọc file từ đĩa, từ chối với HTTP 403 nếu truy cập ra ngoài thư mục dự án; kiểm tra khớp revision.
   - Khắc phục Probe 06b: yêu cầu client phải chứng minh có token hợp lệ (`?token=...` hoặc header) trước khi cấp cookie `viecodie-session`; các yêu cầu tĩnh unauthenticated `GET /` tuyệt đối không được cấp token cookie; các API như `/api/health` từ chối với HTTP 401 nếu thiếu token.
   - Endpoint `/api/review/apply` kiểm tra containment của toàn bộ file trong patch và kiểm tra tính tương thích `projectId` trước khi áp dụng bản vá.

3. **Scanner Symlink & Junction Containment (`src/review/scanner.ts`)**:
   - Khắc phục Probe 06a: scanner kiểm tra `lstatSync` và `realpathSync` cho từng file/thư mục; tự động bỏ qua các symlink hoặc junction trỏ ra ngoài `projectRoot` (`filesIgnored` với lý do `'Symlink target outside project root'`).
   - Ngăn chặn đệ quy vô hạn với `visitedDirs` chống circular directory links.

4. **Engine & Cache Isolation (`src/review/engine.ts`, `contracts/review-v1.ts`)**:
   - Định danh dự án `projectId` được tính toán chuẩn hóa từ đường dẫn `projectRoot` (`computeProjectId`).
   - Xóa bỏ cơ chế ghi đè `latest-review.json` dùng chung toàn cục. Bộ nhớ cache được phân vùng riêng biệt theo `projects/<projectId>/latest.json`, `projects/<projectId>/review-<revision>.json` và `sessions/review-<sessionId>.json`.
   - Các truy vấn `getCurrentReport` bắt buộc khớp `projectId` hoặc `sessionId`, loại bỏ hoàn toàn hiện tượng ô nhiễm chéo cache giữa các dự án khác nhau.

5. **Lọc Secret trước AI / Log (`src/review/scrub.ts`, `src/review/ai.ts`, `src/review/verify.ts`)**:
   - Xây dựng module làm sạch bảo mật `scrubSecrets` nhận diện và che giấu tự động:
     - OpenAI API keys (`sk-...`, `sk-proj-...`)
     - Anthropic API keys (`sk-ant-...`)
     - GitHub tokens (`ghp_...`, `github_pat_...`)
     - AWS Access Key IDs & Secret Keys (`AKIA...`)
     - Google, Slack, Stripe API keys
     - Khóa bí mật PEM / chứng chỉ (`-----BEGIN ... PRIVATE KEY-----`)
     - JWT tokens (`eyJ...`)
     - Mật khẩu trong chuỗi kết nối cơ sở dữ liệu (`postgres://user:pass@host/db`)
     - Các gán biến nhạy cảm (`api_key = "..."`, `password: "..."`)
   - Tích hợp `scrubSecrets` vào dữ liệu tệp gửi đến LLM trong `src/review/ai.ts` (`fileSummaries`, `ruleFindingsSummary`, `userRequirement`) và bộ lọc nhật ký kiểm thử `sanitizeLog` trong `src/review/verify.ts`.

6. **Kiểm chứng & Regression Tests**:
   - Thêm bộ kiểm thử bảo mật toàn diện `src/review/t02Security.test.ts` với 18 bài test kiểm tra Probe 05, Probe 06a, Probe 06b, Project Cache Isolation và Secret Scrubbing: **16 passed, 2 skipped** (do môi trường Windows không bật quyền symlink không-admin).
   - Toàn bộ test suite dự án: **58 test files, 780 tests passed**.
   - Kiểm tra kiểu dữ liệu: `npm run typecheck` exit 0.
   - Biên dịch hoàn tất: `npm run build` exit 0.

## T03 — DONE: Unified Runner Service (src/runner/), Container & Process Backends, Discovery Tĩnh không Eval, Adapters & Integration Tests

Hoàn tất: 27/10/2026.

### Kết quả triển khai T03

1. **Khám phá cấu hình tĩnh không thực thi code (`src/runner/discovery.ts`)**:
   - Khám phá các tệp `package.json`, `vitest.config.*`, `tsconfig.json`, `Cargo.toml`, `go.mod`, `pytest.ini` bằng cách đọc tệp tĩnh qua `fs.readFileSync`, tuyệt đối **không dùng `eval` hay `import()`** mã nguồn dự án đích chưa kiểm duyệt.
   - Bỏ qua các placeholder giả lập mặc định (như `echo "Error: no test specified"`).
   - Phân loại rõ ràng loại lệnh (`checkKind`): `'test_suite'` (vitest, jest, pytest, cargo test) vs `'typecheck'` (tsc) vs `'linter'` (eslint) vs `'build'`.

2. **Kiến trúc trừu tượng Runner Backend (`src/runner/backends/`)**:
   - Giao diện `RunnerBackend` chuẩn hóa với hai backend thực thi:
     - `ContainerRunner`: Kiểm tra tính khả dụng của Docker (`isAvailable()`). Nếu Docker daemon không có sẵn (như trên máy kiểm tra Windows hiện tại), trả về trung thực `status: 'unsupported'`, tuyệt đối không âm thầm chạy trên host để giả mạo sandbox container. Khi có Docker, thiết lập volume mount và network sandbox cô lập (`--network none`).
     - `ProcessRunner`: Thực thi lệnh trên host với cơ chế hủy cây tiến trình triệt để (`taskkill /pid <PID> /T /F` trên Windows, process group `process.kill(-pid, 'SIGKILL')` trên POSIX); thiết lập biến môi trường an toàn (`CI=1`, `FORCE_COLOR=0`, `NODE_ENV=test`); giới hạn dung lượng log đệm (`maxLogBytes`).
   - Cả hai backend đều bắt buộc kiểm tra path containment (`confineToRoot`) đối với thư mục dự án đích.

3. **Adapter trích xuất kết quả có cấu trúc (`src/runner/adapters/`)**:
   - `parseVitestOutput`: Bóc tách chi tiết số lượng pass/fail/skipped, thời lượng (`durationMs`), và danh sách từng ca kiểm thử từ kết quả Vitest/Jest.
   - `parseNodeTestTapOutput`: Bóc tách định dạng TAP (`# pass 1`, `# fail 2`, `ok`, `not ok`).
   - Lệnh kiểm tra kiểu (`typecheck`) và linter không bị gán số đếm test giả; các lệnh này phân biệt rõ ràng với test suite.

4. **Đồng nhất hai runner `review verify` và `fix run` (`src/runner/service.ts`)**:
   - Cả `src/review/verify.ts` (`runVerification`) và `src/fix/run.ts` (`runCheck`, `detectCheck`) đều được chuyển sang sử dụng thống nhất `defaultRunnerService`.
   - Toàn bộ log trước khi trả về hoặc lưu trữ đều được làm sạch tự động qua module `scrubSecrets`.

5. **Kiểm chứng & Regression Tests**:
   - Tạo bộ kiểm thử mới `src/runner/runner.test.ts` bao gồm 17 bài test kiểm tra khám phá tĩnh, adapters, phát hiện môi trường container, hủy tiến trình, timeout, cancellation và tích hợp: **17/17 tests passed**.
   - Toàn bộ test suite dự án: **59 test files, 797 tests passed** (tăng thêm 17 bài test so với T02).
   - Kiểm tra kiểu dữ liệu: `npm run typecheck` exit 0.
   - Biên dịch hoàn tất: `npm run build` exit 0.

## Bàn giao để tiếp T01

Yêu cầu AGY:

> Đọc kế hoạch nâng cấp và docs/UPGRADE_STATUS.md. Thực hiện T01: patch record thật phía server, UI render đúng diff, Apply đúng patchId và confirm boolean; không đánh dấu thành công khi API lỗi; patch rỗng/không hỗ trợ không Apply; bỏ số test/score/revision giả. Thêm regression tests cho các lỗi T00 đã tái hiện. Giữ bố cục hiện tại. Không sửa graph/LLM/runner Docker trong T01. Xong thì báo lệnh kiểm chứng, file thay đổi và các ca chưa nghiệm thu.

T01 có thể bắt đầu mà không chờ Docker hoặc DeepSeek. Chưa push bất kỳ thay đổi nào lên repo của người dùng.

## T04 — DONE: Snapshot, Candidate, Patch, Apply & Undo Services, Contract v2 / Manifest, API và UI Verification

Hoàn tất: 27/10/2026.

### Kết quả triển khai T04

1. **Snapshot Service (`src/review/snapshotService.ts`)**:
   - `createProjectSnapshot(projectRoot, filePaths?)`: Tạo snapshot bất biến lưu nội dung tệp trước/sau khi can thiệp, tính toán `sourceHash` (SHA-256) chuẩn xác của toàn bộ tệp được snapshot. Lưu trữ cả trong bộ nhớ và ghi ra đĩa tại `.viecodie/snapshots/<snapshotId>.json`.
   - `restoreProjectSnapshot(projectRoot, snapshotId)`: Khôi phục chính xác từng byte (byte-for-byte) các tệp tin từ bản snapshot đã lưu, có kiểm tra nghiêm ngặt `confineToRoot` để chống path traversal.
   - Hỗ trợ xóa/dọn dẹp cache snapshot với `clearSnapshots()`.

2. **Candidate Service & Cryptographic Hashes (`src/review/candidateService.ts`)**:
   - `computePatchHash(patch)`: Tạo mã băm SHA-256 tất định (deterministic cryptographic hash) dựa trên đường dẫn tệp, oldHash, newHash và nội dung unified diff.
   - `createCandidate` & `generateCandidates`: Tạo các ứng viên bản vá (`Candidate`) kết nối chặt chẽ giữa `findingId`, `patchId`, `baseRevision`, `targetRevision`, `patchHash` và trạng thái (`proposed`, `applied`, `rejected`, `undone`).

3. **Apply & Undo Service với Snapshot Ledger (`src/review/applyService.ts`)**:
   - `applyPatchWithSnapshot`:
     - Chụp snapshot trước khi sửa (`snapshotBeforeId`).
     - Áp dụng các thay đổi tệp trên đĩa một cách an toàn.
     - Chụp snapshot sau khi sửa (`snapshotAfterId`).
     - Tái thẩm định mã nguồn (`reviewProject`) để cập nhật revision mới.
     - Tạo bản ghi sổ cái `ApplyRecord` bất biến gồm `recordId`, `patchId`, `candidateId`, `baseRevision`, `newRevision`, `snapshotBeforeId`, `snapshotAfterId`, `patchHash`, `sourceHashBefore`, `sourceHashAfter`, `modifiedFiles`.
     - Ghi nhận `applyHistory` vào báo cáo.
   - `undoApplyWithSnapshot`:
     - Tìm kiếm bản ghi `ApplyRecord` mục tiêu (theo `applyRecordId`, `patchId` hoặc bản vá gần nhất).
     - Khôi phục chính xác các tệp từ `snapshotBeforeId` bằng `restoreProjectSnapshot`.
     - Tái thẩm định mã nguồn, khôi phục `restoredRevision`.
     - Đánh dấu bản ghi `ApplyRecord` thành `undone` (không xóa sổ cái lịch sử).
     - Tạo bản ghi `UndoRecord` và thêm vào `undoHistory`.

4. **Mở rộng Contract v2 & Review Report (`contracts/review-v1.ts`, `src/review/engine.ts`, `web/src/lib/reviewTypes.ts`)**:
   - Bổ sung các kiểu dữ liệu cốt lõi: `Candidate`, `ApplyRecord`, `UndoRecord`, `RuntimeFingerprint`, `UndoPatchRequest`, `UndoPatchResponse`.
   - Bổ sung vào `ReviewReport`: `sourceHash`, `testsHash`, `configHash`, `runtimeFingerprint`, `candidates`, `applyHistory`, `undoHistory`.
   - Cập nhật `ReviewReport` trong `engine.ts` để tự động tính toán `sourceHash`, lấy thông tin `runtimeFingerprint` (nền tảng, kiến trúc, phiên bản Node) và tạo liên kết `candidates`.

5. **Tích hợp Web API Endpoints (`src/web/server.ts`)**:
   - `POST /api/review/apply`: Kết nối với `applyPatchWithSnapshot`, trả về đầy đủ `record`, `newRevision`, `report`, và cờ `canUndo: true`.
   - `POST /api/review/undo`: Nhận yêu cầu hoàn tác, gọi `undoApplyWithSnapshot`, trả về tệp đã hoàn tác và báo cáo mới.
   - `GET /api/review/history`: Cung cấp lịch sử hoàn chỉnh `applyHistory`, `undoHistory`, và `candidates` theo phiên làm việc.

6. **Web UI Giao diện Hoàn tác Bản vá (`web/src/components/reviewer/`)**:
   - `RightPanel.tsx`: Khi bản vá đã được áp dụng, giao diện hiển thị nút **"Hoàn tác (Undo)"** cạnh nút **"Chạy lại kiểm thử"**, kèm hiệu ứng tải và xử lý lỗi trực quan; sử dụng icon `IconArrowBackUp`.
   - `ReviewerLayout.tsx`: Tích hợp hàm `handleUndoPatch` gọi endpoint `/api/review/undo`, truyền đúng session và token xác thực, tự động cập nhật lại báo cáo sau khi hoàn tác.

7. **Kiểm chứng & Test Suite (`src/review/t04ApplyUndo.test.ts`)**:
   - Đã thêm bộ kiểm thử mới `src/review/t04ApplyUndo.test.ts` gồm 8 bài test chuyên sâu bao quát: Snapshot Service, Candidate Service & Cryptographic Hashes, Apply & Undo Ledger, Web API Endpoints (`/api/review/undo`, `/api/review/history`), Contract v2 Metadata: **8/8 tests passed**.
   - Toàn bộ test suite dự án: **60 test files, 805 tests passed** (tăng thêm 8 test so với T03).
   - Kiểm tra kiểu dữ liệu: `npm run typecheck` exit 0 (cả CLI và Web).
   - Biên dịch hoàn tất: `npm run build` exit 0.

## T05 — DONE: Test Bundle / Import Endpoints, Test Drawer & Runner Service Integration, Fix Loop Unified Execution

Hoàn tất: 27/10/2026.

### Kết quả triển khai T05

1. **Test Bundle Service (`src/runner/testBundleService.ts`)**:
   - `importTestBundle(options)`: Tiếp nhận gói tệp kiểm thử không qua file nén ZIP nguy hiểm; kiểm tra nghiêm ngặt tính an toàn đường dẫn với `confineToRoot` và `isPathContained`, từ chối dứt khoát mọi hành vi leo thang thư mục (`..` path traversal); ghi tệp an toàn vào đĩa và tính toán mã băm SHA-256 `testsHash`.
   - `listProjectTestFiles(projectRoot)`: Quét đệ quy tìm kiếm toàn bộ các tệp kiểm thử trong dự án (theo regex chuẩn `test|spec`), tự động bỏ qua các thư mục `node_modules`, `.git`, `.viecodie`, `dist`.
   - `computeTestsHash(projectRoot, filePaths?)`: Tính toán mã băm SHA-256 tất định trên toàn bộ nội dung tệp kiểm thử phát hiện được, đảm bảo tính bất biến và chống giả mạo kết quả kiểm thử.

2. **Web API Test Endpoints (`src/web/server.ts`)**:
   - `GET /api/review/tests`: Trả về danh sách tệp kiểm thử hiện có, danh sách lệnh kiểm thử được khám phá tĩnh (`suggestedCommands`), mã băm `testsHash` và cờ `hasTests`.
   - `POST /api/review/tests/import`: Nhận danh sách `testFiles: Array<{ filePath, content }>`, nhập tệp an toàn vào cây mã nguồn và cập nhật `testsHash` vào báo cáo phiên hiện hành.
   - `POST /api/review/tests/run`: Thực thi trực tiếp bộ kiểm thử qua `runVerification` và `defaultRunnerService`, lưu kết quả `VerificationResult` vào báo cáo phiên và trả về trạng thái chuẩn xác.

3. **Giao diện Web Test Drawer (`web/src/components/reviewer/TestDrawer.tsx`)**:
   - Tích hợp 2 chế độ hiển thị linh hoạt qua thanh tab:
     - **Kiểm thử (`cases`)**: Hiển thị danh sách từng ca kiểm thử con (`TestCase`) với nhãn trạng thái `ĐẠT` (xanh), `TRƯỢT` (đỏ), `BỎ QUA` (xám), thời lượng thực thi (`durationMs`), và thông báo lỗi chi tiết khi kiểm thử thất bại.
     - **Nhật ký Console (`logs`)**: Hiển thị toàn bộ nhật ký terminal đã được làm sạch secret (`sanitizedLog`) kèm lệnh thực thi và mã thoát (`exitCode`).
   - Loại bỏ hoàn toàn số liệu giả (fake test counts `1 pass / 1 fail`) trong `ReviewerLayout.tsx`, liên kết trực tiếp với dữ liệu `testsSummary` và `tests` thực tế từ server.

4. **Đồng nhất Fix Loop với Runner Service (`src/fix/run.ts`)**:
   - Cập nhật hàm `detectCheck` để ưu tiên sử dụng `discoverChecks` từ `src/runner/discovery.ts`, khám phá lệnh kiểm thử tự động bằng phân tích tĩnh cấu trúc tệp mà không thực thi mã nguồn lạ.
   - Hàm `runCheck` thực thi qua `defaultRunnerService` với cơ chế kiểm soát timeout, kill process tree đa tầng và làm sạch secret.

5. **Kiểm chứng & Regression Tests (`src/runner/t05TestRunner.test.ts`)**:
   - Đã thêm bộ kiểm thử mới `src/runner/t05TestRunner.test.ts` gồm 11 bài test chuyên sâu:
     - Nhập tệp kiểm thử an toàn và tính toán `testsHash`: Đạt.
     - Từ chối path traversal ngoài root: Đạt.
     - Kiểm tra cờ ghi đè `overwrite: false`: Đạt.
     - Khám phá tệp test và tính bất biến của `testsHash`: Đạt.
     - Các endpoint `GET /api/review/tests`, `POST /api/review/tests/import`, `POST /api/review/tests/run`: Đạt.
     - Tích hợp `detectCheck` và `runCheck` trong fix loop: Đạt.
   - Toàn bộ test suite dự án: **61 test files, 816 tests passed** (tăng thêm 11 test so với T04).
   - Kiểm tra kiểu dữ liệu: `npm run typecheck` exit 0 (cả CLI và Web).
   - Biên dịch hoàn tất: `npm run build` exit 0.

## T06 — DONE: AST Graph Engine, TypeScript Program / Qualified Method Resolution, Disambiguation & Full-Path Preservation

Hoàn tất: 27/10/2026.

### Kết quả triển khai T06

1. **Khắc phục Triệt để Probe 08a (Import Alias Resolution — `src/review/ast.ts`)**:
   - Khi phân tích các câu lệnh `import { hashPassword as computeSha } from './crypto.js'`, AST Engine phân tách rạch ròi giữa tên cục bộ (`localName = 'computeSha'`) và tên gốc xuất bản (`exportedName = 'hashPassword'`).
   - Xử lý mở rộng độ phân giải đường dẫn import TypeScript ESM: hỗ trợ import đuôi `.js` / `.mjs` trỏ tới tệp mã nguồn `.ts` / `.tsx` tương ứng.
   - Khi gặp lời gọi hàm qua bí danh `computeSha()`, hệ thống tự động ánh xạ chính xác tới khai báo gốc `fn:src/crypto.ts:hashPassword`, tạo cạnh liên kết `call` có trạng thái `resolved: 'resolved'`, bổ sung đúng `callerIds` và `calleeIds`.

2. **Khắc phục Triệt để Probe 08b (Phân biệt Lời gọi Phương thức vs Hàm Độc lập — `src/review/ast.ts`)**:
   - Tách biệt rõ ràng giữa lời gọi hàm trực tiếp `ts.isIdentifier(node.expression)` và lời gọi thuộc tính/phương thức `ts.isPropertyAccessExpression(node.expression)` (`obj.method()`).
   - Loại bỏ hoàn toàn cơ chế heuristic sai lầm từng tự động nối `paymentGateway.validate()` với hàm độc lập toàn cục `function validate()`. Lời gọi phương thức chỉ được giải quyết khi khớp với instance/class/namespace tương ứng.

3. **Khắc phục Triệt để Probe 08c (Định danh Phương thức Trùng tên Giữa các Class — `src/review/ast.ts`)**:
   - Xác định phạm vi bao đóng (`enclosingScope`) của từng hàm hoặc phương thức khi duyệt cây AST.
   - Các phương thức trong class hoặc object literal được đặt tên theo cú pháp chuẩn hóa: `Admin.delete` và `Article.delete`.
   - Sinh mã định danh phân biệt tuyệt đối: `fn:src/models.ts:Admin.delete` và `fn:src/models.ts:Article.delete`. Loại bỏ hoàn toàn hiện tượng ID trùng lặp và ghi đè node trên đồ thị.

4. **Khắc phục Triệt để Probe 09 (Bảo toàn Đường dẫn Tương đối Đầy đủ — `ReviewerLayout.tsx`, `engine.ts`)**:
   - Loại bỏ thao tác rút gọn đường dẫn thành basename (`f.filePath?.split(/[\\/]/).pop()`) từng khiến các tệp cùng tên ở thư mục khác nhau (như `src/moduleA/index.ts` và `src/moduleB/index.ts`) bị gộp thành một tệp `index.ts` duy nhất.
   - Giữ nguyên đường dẫn tương đối chuẩn hóa (POSIX forward slashes) cho toàn bộ danh sách tệp `scanScope.filesRead`, các `GraphNode` (`file:src/moduleA/index.ts`), danh sách tệp trong Web UI và bản đồ nội dung `fileContents`. Nội dung của từng tệp được lưu trữ độc lập và không bao giờ bị ghi đè.

5. **Kiểm chứng & Regression Tests (`src/review/t06AstGraph.test.ts`)**:
   - Thêm bộ kiểm thử chuyên biệt `src/review/t06AstGraph.test.ts` gồm 4 bài test hồi quy:
     - Probe 08a: Giải quyết đúng import alias -> canonical declaration: Đạt.
     - Probe 08b: Không nối nhầm phương thức object với hàm độc lập: Đạt.
     - Probe 08c: Định danh duy nhất cho các class có phương thức trùng tên: Đạt.
     - Probe 09: Bảo toàn các tệp cùng tên basename ở các thư mục khác nhau: Đạt.
   - Toàn bộ test suite dự án: **62 test files, 820 tests passed** (tăng thêm 4 test so với T05).
   - Kiểm tra kiểu dữ liệu: `npm run typecheck` exit 0 (cả CLI và Web).
   - Biên dịch hoàn tất: `npm run build` exit 0.


## T07 — DONE: Call Graph Context Selector, Finding Validator, Token Accounting & AbortSignal Cancellation (Khắc phục Triệt để Probe 10)

Hoàn tất: 27/10/2026.

### Kết quả triển khai T07

1. **Khắc phục Triệt để Probe 10 (Call Graph-aware Context Selector — `src/review/contextSelector.ts`, `src/review/ai.ts`)**:
   - Loại bỏ hoàn toàn cơ chế thô sơ cũ `files.slice(0, 10).map(...)` từng cắt mù quáng 10 tệp đầu tiên mà không tham chiếu đến các node/edge trên đồ thị.
   - Xây dựng thuật toán `selectGraphContext`:
     - Xác định các nút hạt giống (Seed Nodes - Mức 0) trực tiếp từ các vị trí phát hiện lỗi (`ruleFindings`) hoặc từ khóa yêu cầu người dùng (`userRequirement`).
     - Mở rộng đồ thị theo lân cận 1-hop: Thu thập toàn bộ hàm gọi vào (Inbound Callers - nguồn dữ liệu/entry point) và các hàm được gọi ra (Outbound Callees - điểm chìm/dependency/sink) liên đới.
     - Sinh bản đồ phân tích cấu trúc đồ thị `CALL GRAPH TOPOLOGY & IMPACT PATHS` đưa vào prompt AI để LLM nhận thức rõ ràng chuỗi liên kết caller -> seed -> callee.
     - Trích xuất mã nguồn theo thứ tự ưu tiên đồ thị, che giấu tự động các thông tin nhạy cảm (`scrubSecrets`), và kiểm soát chặt chẽ ngân sách token (`maxTokens`). Dù dự án có hàng trăm tệp, các tệp và hàm liên đới đồ thị luôn được ưu tiên chọn đầu tiên.

2. **AST Finding Validator (`src/review/contextSelector.ts`)**:
   - Xây dựng hàm `validateAiFinding` kiểm tra đối soát nghiêm ngặt mọi finding do AI sinh ra với cây mã nguồn thật:
     - Tệp phải tồn tại thực tế trong danh sách quét.
     - Dòng lỗi phải nằm trong phạm vi tổng số dòng của tệp.
     - Bằng chứng (`evidence`) phải thực sự xuất hiện trong nội dung tệp (chống ảo giác hoàn toàn).
     - Tự động liên kết `nodeId` tới `GraphNode` bao đóng chính xác trên cây AST.
     - Lọc secret và chuẩn hóa phân loại/mức độ nghiêm trọng.

3. **Đo lường Token & Dấu vết Ngữ cảnh (Token Usage & Provenance Metadata — `contracts/review-v1.ts`, `src/review/ai.ts`)**:
   - Bổ sung cấu trúc `TokenUsage` (`promptTokens`, `completionTokens`, `totalTokens`, `estimated`) và `AiProvenance` (`selectedFiles`, `selectedNodes`, `graphNeighborhoodSize`, `completedAt`) vào `ProviderInfo`.
   - Ghi nhận chính xác số token từ streaming chunks hoặc ước lượng tất định, lưu vào báo cáo phiên thẩm định.

4. **Kiểm soát Hủy bỏ An toàn (AbortSignal Cancellation — `src/review/ai.ts`, `src/review/engine.ts`)**:
   - Tích hợp `AbortSignal` vào `ReviewProjectOptions`, `runAiEnhancement` và `chatStream`.
   - Xử lý race-condition giữa LLM stream, timeout (30s) và abort signal. Khi bị hủy hoặc timeout, hệ thống fallback mượt mà về `rules_only_fallback` kèm lý do cụ thể mà không bao giờ treo tiến trình.

5. **Kiểm chứng & Regression Tests (`src/review/t07AiContext.test.ts`)**:
   - Thêm bộ kiểm thử mới `src/review/t07AiContext.test.ts` gồm 6 bài test chuyên sâu:
     - Khắc phục Probe 10: `selectGraphContext` ưu tiên seed finding và lân cận caller/callee vượt qua 10 tệp đầu: Đạt.
     - Che giấu secret trong ngữ cảnh đồ thị và yêu cầu người dùng: Đạt.
     - `validateAiFinding` chấp nhận finding thật, bác bỏ hoàn toàn file/dòng/evidence ảo giác: Đạt.
     - Chế độ fallback và ghi nhận đầy đủ provenance metadata: Đạt.
     - Hủy tác vụ an toàn với `AbortSignal`: Đạt.
     - Tích hợp `reviewProject` với context selector và user requirement: Đạt.
   - Toàn bộ test suite dự án: **63 test files, 826 tests passed, 6 skipped, 0 failed (100% pass trên Windows)**.
   - Kiểm tra kiểu dữ liệu: `npm run typecheck` exit 0 (cả CLI và Web).
   - Biên dịch hoàn tất: `npm run build` exit 0 (`dist/cli.js` 691 KB và `dist/web/`).
