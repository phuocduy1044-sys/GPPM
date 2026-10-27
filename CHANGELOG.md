# Changelog

## [3.14.0](https://github.com/phuocduy1044-sys/GPPM/compare/viecodie-v3.13.1...viecodie-v3.14.0) (2026-10-27)


### Features

* **a:** complete core review engine upgrade T00-T07 with security containment, snapshot ledger, runner service, qualified ast graph, and call graph ai context ([e27232f](https://github.com/phuocduy1044-sys/GPPM/commit/e27232faf70ebada1a63c913a9f21b87a237b9dd))
* **b:** automate benchmark runner B4, SBOM and installation guide B5, expand static rules B6 ([cc9c951](https://github.com/phuocduy1044-sys/GPPM/commit/cc9c951940341229d01ee61aec0e2ce84d60ae0e))
* **b:** complete benchmark runner B4, open source dossier B5, static rules B6, demo script B7 ([cfd9f6f](https://github.com/phuocduy1044-sys/GPPM/commit/cfd9f6ffef795601ad2aaa1c3285ebfc23e1a8a7))
* **b:** complete technical documentation B1, benchmark ground-truth B2, and web UI interactions B3 ([2fea60d](https://github.com/phuocduy1044-sys/GPPM/commit/2fea60dc152e4b220e5f1ef14b5fd6ecd4b6a643))
* **b:** smoke test automation B8, demo project polish B9, evidence and audit sync B10 ([2a2cb4c](https://github.com/phuocduy1044-sys/GPPM/commit/2a2cb4ca9b4e2a2d91d2124fbc9b963a9dbc0232))
* **cli,web:** implement CLI-first workflow with /review and /graph slash commands ([95e243d](https://github.com/phuocduy1044-sys/GPPM/commit/95e243d9bd130673bf292b7ac615fcfdc4cc2861))
* **cli:** 100% CLI mind map graph view with error annotations and no web dependencies ([e860c77](https://github.com/phuocduy1044-sys/GPPM/commit/e860c7701e1d1de3eaf0be25baea781a37516054))
* **contract:** add Review Engine Contract v1, sample report and API specs ([491f6a4](https://github.com/phuocduy1044-sys/GPPM/commit/491f6a45ab736da0bc84b12737621dbbc5b39b49))
* enhance /graph routing, clean CLI welcome UI, and add 10min presentation dossier ([4a0a314](https://github.com/phuocduy1044-sys/GPPM/commit/4a0a31432d6ce670298179544762bf966a8bb532))
* **integration:** connect ReviewerLayout UI to live backend review endpoints ([680fa0d](https://github.com/phuocduy1044-sys/GPPM/commit/680fa0d759a245ad5a18bad3d7d208e40438b5ee))
* **review-graph:** bind live CLI review data to Web Reviewer with dynamic layout and token auth ([00ccd10](https://github.com/phuocduy1044-sys/GPPM/commit/00ccd103436863e008a1e0e43211678b395e604d))
* **review,ui:** expand AST rules (secrets, loose eq, var), enhance UI caller/callee highlight and achieve 729/733 tests pass ([a93ea49](https://github.com/phuocduy1044-sys/GPPM/commit/a93ea49b2f5dd05bf31f273b086d4a6707946670))
* **review:** implement core review engine, CLI review & verify, and demo project ([98b8709](https://github.com/phuocduy1044-sys/GPPM/commit/98b8709d1d2b1a1e6db47891549ab81e1c1ea316))
* **review:** support custom requirements, context folder fallback, and notification when no folder exists ([1ad1266](https://github.com/phuocduy1044-sys/GPPM/commit/1ad12668c30456f11a878187e6762bcd89eaf088))
* **security,ui:** eliminate demo fallback, mask hardcoded secrets and implement loopback session cookie auth ([0155fa4](https://github.com/phuocduy1044-sys/GPPM/commit/0155fa4626bcfaddd11d360a43bf89e6994a92ca))
* **ui:** reconnect /graph command to open Web Code Reviewer by Graph ([c187547](https://github.com/phuocduy1044-sys/GPPM/commit/c1875478169d9a327d670b8a0ac026be3c9d7fc6))
* **web,docs:** implement Code Reviewer by Graph UI and complete open source documentation suite ([c121fe9](https://github.com/phuocduy1044-sys/GPPM/commit/c121fe9faab100176a32f55d8ce69b71af2a7cb1))


### Bug Fixes

* **cli:** restore session linking and outdated warnings in reviewGraphHandler, remove duplicate THIRD_PARTY.md ([2f6f759](https://github.com/phuocduy1044-sys/GPPM/commit/2f6f7597ce9b3cae858af8aebe5aa1d967873c54))
* **review:** auto-detect folder from context when running bare /review ([6715bb8](https://github.com/phuocduy1044-sys/GPPM/commit/6715bb8a2fd52b8942dab10fceaa1c76f336a0ea))
* **ui:** eliminate flicker in command palette navigation and first input blink ([7d139fc](https://github.com/phuocduy1044-sys/GPPM/commit/7d139fce860ce26ad889bca23e6573a7af8c5fcc))
* **ux:** 2-mode permissions, Vietnamese IME (Telex/VNI) & screen flicker ([469658a](https://github.com/phuocduy1044-sys/GPPM/commit/469658a84fab752056c31bb08388deb7d4d7dcdc))
* **web-fix:** resolve apply patch session propagation and test verification pass ([51910ba](https://github.com/phuocduy1044-sys/GPPM/commit/51910ba50b2204af0b7255da2c78c5d4971b262a))
* **web:** restore selectedNode definition in GraphReview ([48b5d28](https://github.com/phuocduy1044-sys/GPPM/commit/48b5d281d002531b9aaec8394f2cad376da88be0))
* **windows:** resolve Windows file locks, EPERM, path normalization and achieve 728/732 tests passing ([6a0504d](https://github.com/phuocduy1044-sys/GPPM/commit/6a0504dca07992c990d791bc76a33843932218dc))

## [3.13.1](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.13.0...viecodie-agent-v3.13.1) (2026-10-21)


### Bug Fixes

* **ui:** don't bring back a finished task list on the next turn ([#137](https://github.com/maruakshay/viecodie-cli/issues/137)) ([88bc3cf](https://github.com/maruakshay/viecodie-cli/commit/88bc3cfa0932c496b6cc8763c1a90e994a6b764f))

## [3.13.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.12.2...viecodie-agent-v3.13.0) (2026-10-21)


### Features

* **ui:** name tool calls Claude Code style ([#135](https://github.com/maruakshay/viecodie-cli/issues/135)) ([bf4518c](https://github.com/maruakshay/viecodie-cli/commit/bf4518ca46e7200b52802580c92aa403095170e2))

## [3.12.2](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.12.1...viecodie-agent-v3.12.2) (2026-10-21)


### Bug Fixes

* **agent:** recover from output-cap truncation, configurable max turns ([#132](https://github.com/maruakshay/viecodie-cli/issues/132)) ([c5440e9](https://github.com/maruakshay/viecodie-cli/commit/c5440e9608816623c0eaf918cb24a228244a898f))

## [3.12.1](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.12.0...viecodie-agent-v3.12.1) (2026-10-20)


### Bug Fixes

* **ui:** turn receipts, pinned task list, session tally and terminal bell ([#130](https://github.com/maruakshay/viecodie-cli/issues/130)) ([9fd919b](https://github.com/maruakshay/viecodie-cli/commit/9fd919b6a7794d22536a5bf26f24a6b2587868e7))

## [3.12.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.11.0...viecodie-agent-v3.12.0) (2026-10-08)


### Features

* **web:** permission card matches the terminal prompt ([#127](https://github.com/maruakshay/viecodie-cli/issues/127)) ([fb14ccd](https://github.com/maruakshay/viecodie-cli/commit/fb14ccd562e3100333587c44a4b1000834736b6f))

## [3.11.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.10.3...viecodie-agent-v3.11.0) (2026-10-08)


### Features

* **web:** model search, safer permission keys, background-tab alerts ([#124](https://github.com/maruakshay/viecodie-cli/issues/124)) ([38183de](https://github.com/maruakshay/viecodie-cli/commit/38183de503663608d1d63b6e854bd9a6dce389f7))

## [3.10.3](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.10.2...viecodie-agent-v3.10.3) (2026-10-07)


### Bug Fixes

* typed model names win over substring matches; tell model run_bash can curl ([#122](https://github.com/maruakshay/viecodie-cli/issues/122)) ([c8272ef](https://github.com/maruakshay/viecodie-cli/commit/c8272ef56c978ca717029bc2df506bc826f46de1))

## [3.10.2](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.10.1...viecodie-agent-v3.10.2) (2026-10-04)


### Bug Fixes

* **models:** accept typed model names; handle providers without /models ([#120](https://github.com/maruakshay/viecodie-cli/issues/120)) ([5d040c8](https://github.com/maruakshay/viecodie-cli/commit/5d040c885f1ab8988667b710acf7195c760a42e9))

## [3.10.1](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.10.0...viecodie-agent-v3.10.1) (2026-10-01)


### Bug Fixes

* **security:** trust gate for project config, symlink-safe paths, web crash ([#118](https://github.com/maruakshay/viecodie-cli/issues/118)) ([c94d433](https://github.com/maruakshay/viecodie-cli/commit/c94d433e010f578f489fe1717fa1abc9a4a415ba))

## [3.10.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.9.1...viecodie-agent-v3.10.0) (2026-10-01)


### Features

* **web:** rewind from the transcript, syntax highlighting, TUI palette ([#116](https://github.com/maruakshay/viecodie-cli/issues/116)) ([91d6440](https://github.com/maruakshay/viecodie-cli/commit/91d6440f170ac54abff2b8308b0073465d7037d9))

## [3.9.1](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.9.0...viecodie-agent-v3.9.1) (2026-09-30)


### Bug Fixes

* **ui:** render terminal markdown in a near-monochrome palette ([#115](https://github.com/maruakshay/viecodie-cli/issues/115)) ([3de8810](https://github.com/maruakshay/viecodie-cli/commit/3de8810cbd49eae9817a23b80cf6d8ad6adf7744))
* **web:** make model, effort and mode menus usable; tone down styling ([#113](https://github.com/maruakshay/viecodie-cli/issues/113)) ([b3ede79](https://github.com/maruakshay/viecodie-cli/commit/b3ede797951b67a323a4974cfdebb2270f800229))

## [3.9.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.8.0...viecodie-agent-v3.9.0) (2026-09-30)


### Features

* **ui:** point to `viecodie web` on the welcome card ([52d583a](https://github.com/maruakshay/viecodie-cli/commit/52d583ac86ff3acb3e0447982582d88ebf424fcf))
* **web:** add `viecodie web`, a desktop-style browser UI for the agent ([#110](https://github.com/maruakshay/viecodie-cli/issues/110)) ([5f64a4e](https://github.com/maruakshay/viecodie-cli/commit/5f64a4e5487d8c02b8d85a51c0b440b80af2ac6e))

## [3.8.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.7.1...viecodie-agent-v3.8.0) (2026-09-29)


### Features

* **fix:** add `viecodie fix` — run the check, fix failures, repeat until green ([b17cf27](https://github.com/maruakshay/viecodie-cli/commit/b17cf27203965572f545f2f41f46cc05dcd3f4e7))
* **ui:** drag to select and copy inside viecodie, with the wheel still scrolling ([8f63ef1](https://github.com/maruakshay/viecodie-cli/commit/8f63ef1d0f3138ecad3f1224b67f264549c469cf))

## [3.7.1](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.7.0...viecodie-agent-v3.7.1) (2026-09-28)


### Bug Fixes

* **ui:** pin input bar to the bottom with an in-app scroll viewport ([#105](https://github.com/maruakshay/viecodie-cli/issues/105)) ([ea4c76f](https://github.com/maruakshay/viecodie-cli/commit/ea4c76f972ad8d54bcda62f6c09bbfb5682bf2d4))

## [3.7.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.6.0...viecodie-agent-v3.7.0) (2026-09-28)


### Features

* **ui:** Claude-style transcript, live status line, mid-turn steering ([#103](https://github.com/maruakshay/viecodie-cli/issues/103)) ([fa52f39](https://github.com/maruakshay/viecodie-cli/commit/fa52f3982b2549ff14bca5fb75eff2044b3cfd1b))

## [3.6.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.5.0...viecodie-agent-v3.6.0) (2026-09-27)


### Features

* apply file edits with sed, skip WSL bash on Windows ([#100](https://github.com/maruakshay/viecodie-cli/issues/100)) ([0cf3b81](https://github.com/maruakshay/viecodie-cli/commit/0cf3b8194ab4fba33017c227f501bf952b1be9ef))

## [3.5.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.4.0...viecodie-agent-v3.5.0) (2026-09-21)


### Features

* decision box and shell-backed file I/O ([63d40d5](https://github.com/maruakshay/viecodie-cli/commit/63d40d5a30563cd984a96923f4d89f6611be459f))

## [3.4.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.3.0...viecodie-agent-v3.4.0) (2026-09-18)


### Features

* add tool descriptions and enhanced diff rendering ([#93](https://github.com/maruakshay/viecodie-cli/issues/93)) ([bc51d7a](https://github.com/maruakshay/viecodie-cli/commit/bc51d7a1e528ad0495f42b36f90784081159fa38))
* MCP servers, shell hooks, subagents, headless mode and checkpoints ([#95](https://github.com/maruakshay/viecodie-cli/issues/95)) ([7f735c6](https://github.com/maruakshay/viecodie-cli/commit/7f735c6481c27da908b3ac0165e6b0b4ec2b34e8))

## [3.3.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.2.0...viecodie-agent-v3.3.0) (2026-09-18)


### Features

* add repair tracking to eval harness and implement lazy loading for model contexts in UI ([#92](https://github.com/maruakshay/viecodie-cli/issues/92)) ([5d553f4](https://github.com/maruakshay/viecodie-cli/commit/5d553f41fe533b52b6d9d8bbe9961ccb916aef65))
* implement flexible provider management and adapter-based LLM client ([#90](https://github.com/maruakshay/viecodie-cli/issues/90)) ([d973c0e](https://github.com/maruakshay/viecodie-cli/commit/d973c0ed76c6ff88b6995f67df169e4a8e4369bc))

## [3.2.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.1.0...viecodie-agent-v3.2.0) (2026-09-05)


### Features

* plan mode, custom slash commands, project-scoped permissions ([#87](https://github.com/maruakshay/viecodie-cli/issues/87)) ([a8a1912](https://github.com/maruakshay/viecodie-cli/commit/a8a19121f5fb868fbb161bb51a1aad00e22cb29e))

## [3.1.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v3.0.0...viecodie-agent-v3.1.0) (2026-09-05)


### Features

* **ui:** compact a full context, and copy text out of the transcript ([#85](https://github.com/maruakshay/viecodie-cli/issues/85)) ([58c2339](https://github.com/maruakshay/viecodie-cli/commit/58c23394d696377d4930e263037076b3f7b6d64e))

## [3.0.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v2.0.0...viecodie-agent-v3.0.0) (2026-09-05)


### ⚠ BREAKING CHANGES

* **ui:** ChatMessage gains a `thinking` field. Agent history doesn't carry thinking, so a resumed session shows no thoughts on turns from before the resume.

### Features

* add demo GIF to showcase functionality ([64188ff](https://github.com/maruakshay/viecodie-cli/commit/64188ffc8f24fdf5ac830cf4262b34b847babecf))
* add demo GIF to showcase functionality ([b44eb65](https://github.com/maruakshay/viecodie-cli/commit/b44eb651cf5e718b05ff8ac0514a9a1f6a66941b))
* add GitHub Pages landing site with live changelog ([023363f](https://github.com/maruakshay/viecodie-cli/commit/023363f5313fae2c6bcca4ef8c9a69f82f6c1374))
* add npm package + release-please automation ([60b48df](https://github.com/maruakshay/viecodie-cli/commit/60b48dfbaec822f81b3bebf538f7f38c79facd5f))
* add terminal hard-clear functionality and enhance command handling in useKeyboard ([e47136e](https://github.com/maruakshay/viecodie-cli/commit/e47136ea765e54b1aac32498dd6783e63e8a7d36))
* **agent:** repair near-miss tool calls and size the prompt to the window ([#74](https://github.com/maruakshay/viecodie-cli/issues/74)) ([0d3f7b8](https://github.com/maruakshay/viecodie-cli/commit/0d3f7b814bee809d6c155f6d88dedab91c66e310))
* background auto-update and leaked tool-call recovery ([71a1094](https://github.com/maruakshay/viecodie-cli/commit/71a109422ddff9ad5836e53333fd5a0a534f493b))
* background auto-update and leaked tool-call recovery ([111dfab](https://github.com/maruakshay/viecodie-cli/commit/111dfabe183c89b2303cb781a85265709a23e09e))
* **cli:** self-update command, auto-allow read-only tools, always em… ([1d89911](https://github.com/maruakshay/viecodie-cli/commit/1d89911d5b28d4c257e62c522c821855c1345abe))
* **cli:** self-update command, auto-allow read-only tools, always emit exit code ([a3fd8c1](https://github.com/maruakshay/viecodie-cli/commit/a3fd8c154d6254fe47f79bda1d2f0e7b8716922e))
* enhance chat function to support reasoning models and improve ThinkingBlock layout handling ([d1b18a9](https://github.com/maruakshay/viecodie-cli/commit/d1b18a997170c068f6151d6f7a30bce5065b9d0a))
* enhance grammar usage for Ollama tool-calling based on model pa… ([a7a4559](https://github.com/maruakshay/viecodie-cli/commit/a7a455929ab27189e142235077cbfeb6385ed47e))
* enhance grammar usage for Ollama tool-calling based on model parameters ([b0955ca](https://github.com/maruakshay/viecodie-cli/commit/b0955caa066b4333c578c20db6d60257b42a9706))
* enhance landing page with updated descriptions, improved styles, and new features section ([85b905c](https://github.com/maruakshay/viecodie-cli/commit/85b905c45f84763b0ff421116c5bcfe42ab525b3))
* enhance UI/UX with markdown rendering, input history, and improved layout ([f5aa1ae](https://github.com/maruakshay/viecodie-cli/commit/f5aa1aec58b50df8e631666c9c789ead7f9da242))
* **eval:** add model eval harness and `viecodie doctor` ([6a62680](https://github.com/maruakshay/viecodie-cli/commit/6a62680e8dfb5549a66e252abda0e5ffc06481cb))
* **eval:** add model eval harness and `viecodie doctor` ([ac3baa4](https://github.com/maruakshay/viecodie-cli/commit/ac3baa4c64e75234f97e46e18c1a0bd657c16c2c))
* **grep:** add context, files_only, type, multiline, count, fixed_strings ([9098f0b](https://github.com/maruakshay/viecodie-cli/commit/9098f0bd18e7099704215bee90240749771cec26))
* image paste for vision models ([c8627ae](https://github.com/maruakshay/viecodie-cli/commit/c8627aef640edbedc9e0a1bdda17f9ca6a43ed4d))
* image paste for vision models ([8a35a57](https://github.com/maruakshay/viecodie-cli/commit/8a35a5757cd781fc70dde45548283380a4b46902))
* implement grammar-constrained actions and generalized permissions ([41742f4](https://github.com/maruakshay/viecodie-cli/commit/41742f49683837158bf4d88baffcfd346383f88f))
* implement grammar-constrained actions and generalized permissions ([2d5ec6b](https://github.com/maruakshay/viecodie-cli/commit/2d5ec6bf8a694513bc3ccaf3df3ddfc9666e53bc))
* implement update check functionality in App component ([6e6ec62](https://github.com/maruakshay/viecodie-cli/commit/6e6ec62d6681d829cafd12d2f0f0b768c48798d5))
* native tool-calling + truncation guards for local models ([cc7a17d](https://github.com/maruakshay/viecodie-cli/commit/cc7a17dea10aa9700997e36eb4b264d43ea03b5b))
* native tool-calling + truncation guards for local models ([d0ad200](https://github.com/maruakshay/viecodie-cli/commit/d0ad200667289735141d326393e84075e2c04f86))
* **prompt:** add goal-understanding and attention re-attend system ([61cadf1](https://github.com/maruakshay/viecodie-cli/commit/61cadf133d84dd9cb4fb889e01113609dcdfe991))
* **prompt:** read project VIECODIE.md into system prompt ([bc01133](https://github.com/maruakshay/viecodie-cli/commit/bc011336705de27737f33cf716f19f284b10f7a4))
* **prompt:** read project VIECODIE.md into system prompt ([88abb2f](https://github.com/maruakshay/viecodie-cli/commit/88abb2fe226593efb7c9d867d6c67816e0e8d828))
* refine agent personality and update processing labels ([1462bc7](https://github.com/maruakshay/viecodie-cli/commit/1462bc7f63033b5efda27827dedb60298f18ea4d))
* refine agent personality and update processing labels ([8ffbc47](https://github.com/maruakshay/viecodie-cli/commit/8ffbc47ca7b7e3db42f16e55a6aab08195222319))
* reflect session summary in terminal tab title ([341eb89](https://github.com/maruakshay/viecodie-cli/commit/341eb89c3de2794dec2765393cf59de8d7ac9641))
* reflect session summary in terminal tab title ([9ea2bd0](https://github.com/maruakshay/viecodie-cli/commit/9ea2bd02d5be9bcae297a00c70c1255062ee08ee))
* release agent personality and write_todos tooling ([#69](https://github.com/maruakshay/viecodie-cli/issues/69)) ([b4ecafd](https://github.com/maruakshay/viecodie-cli/commit/b4ecafd4a3305af59fe1189c5048029c6f55d9fb))
* **security:** input validation, path confinement, persistent permissions ([f800a6c](https://github.com/maruakshay/viecodie-cli/commit/f800a6c15234fa12238879a49da1d8d573edd197))
* **session:** store sessions globally per-project like Claude Code ([690eaa0](https://github.com/maruakshay/viecodie-cli/commit/690eaa069d99ece77ddfe1ad0d8dc3d835ce95e4))
* **session:** summarize first exchange into title ([b8fe10c](https://github.com/maruakshay/viecodie-cli/commit/b8fe10c649bcc5409b52de576cd70b9d74eef8f1))
* **session:** summarize first exchange into title ([768b66a](https://github.com/maruakshay/viecodie-cli/commit/768b66a0304f9c9dfbf8f7e6a6bf9529dd66136b))
* **tools:** batch edits, process-tree kill, abort propagation, image read ([#66](https://github.com/maruakshay/viecodie-cli/issues/66)) ([d12e593](https://github.com/maruakshay/viecodie-cli/commit/d12e59337e1f6f04f5cdf274db5e83e9f80ecad5))
* **tools:** lossless output spill, ranged reads, smarter edit/glob ([8e6ef83](https://github.com/maruakshay/viecodie-cli/commit/8e6ef831da6490a702dc2c2ac8837b3c7ac42eda))
* **tools:** lossless output spill, ranged reads, smarter edit/glob ([69d19b5](https://github.com/maruakshay/viecodie-cli/commit/69d19b58bb987f4553226229fd964b330cde57c8))
* **ui/tools:** ctrl+o expand, diff bg highlight, fuzzy edit, verify nudge ([b3a32e3](https://github.com/maruakshay/viecodie-cli/commit/b3a32e3f037e31ab264d0b8bbc72129fa42f7e3f))
* **ui/tools:** ctrl+o expand, diff bg highlight, fuzzy edit, verify nudge ([7e57ac2](https://github.com/maruakshay/viecodie-cli/commit/7e57ac2fb162a0cea6c54bb34340691aae7f7560))
* **ui:** add sessions view and align command palette descriptions ([8d052d7](https://github.com/maruakshay/viecodie-cli/commit/8d052d7dc58687b8c49e88d35f11c9d74cf71ec1))
* **ui:** change thinking toggle shortcut to ctrl+t ([97be0cd](https://github.com/maruakshay/viecodie-cli/commit/97be0cdc805bb0e97e52923152d298bfc613a3c9))
* **ui:** commit thinking to the transcript instead of the live frame ([#83](https://github.com/maruakshay/viecodie-cli/issues/83)) ([aa9a2f3](https://github.com/maruakshay/viecodie-cli/commit/aa9a2f33802821f3eef1b32fb5888ca9e9a73929))
* **ui:** full-width diff bg with right margin; polish README ([995a549](https://github.com/maruakshay/viecodie-cli/commit/995a549085a948bb8c89878ab6ec63d35499f030))
* **ui:** full-width diff bg with right margin; polish README ([b2d51b7](https://github.com/maruakshay/viecodie-cli/commit/b2d51b7df92de0e9bf9846726f159af372f4a716))
* **ui:** handle missing/stopped ollama gracefully ([bda0da3](https://github.com/maruakshay/viecodie-cli/commit/bda0da37f2b2eb697ffe4bfc810efeea9f920b64))
* **ui:** polish permission prompt, unify cursor glyphs, add empty state ([815bab2](https://github.com/maruakshay/viecodie-cli/commit/815bab2f259b95fdc277b1533fa3ab09e590b721))
* **ui:** rework onboarding, and stop wildcard rules spanning command… ([#76](https://github.com/maruakshay/viecodie-cli/issues/76)) ([6fcc880](https://github.com/maruakshay/viecodie-cli/commit/6fcc8809dd93893118823ae2ad037cc591e3d9bc))
* **ui:** scrollback with mouse support, and a card for user messages ([#79](https://github.com/maruakshay/viecodie-cli/issues/79)) ([d4c5461](https://github.com/maruakshay/viecodie-cli/commit/d4c5461e5d6b930ede8beeb0bbbb7d9d84aeb9ad))
* **ui:** syntax-highlight diffs, fix modal overflow, firm update banner ([a06eb26](https://github.com/maruakshay/viecodie-cli/commit/a06eb26d2dbdc01fa549e86c1a5aa017cfea14cb))
* **ui:** syntax-highlight diffs, fix modal overflow, firm update banner ([634b77d](https://github.com/maruakshay/viecodie-cli/commit/634b77d2ab64f8ce057576c870a0ecb22ad3dc25))
* unified named-provider config with opencode-style picker ([88cadfe](https://github.com/maruakshay/viecodie-cli/commit/88cadfeaa780fa656016096ffdcfc32581acf5d8))
* unified named-provider config with opencode-style picker ([f4dc609](https://github.com/maruakshay/viecodie-cli/commit/f4dc6098d852a8488d77f8614bd0d9f291862798))
* update README and package description for clarity and emphasis on local-first AI capabilities ([793b257](https://github.com/maruakshay/viecodie-cli/commit/793b257f02a279bbb42498a19ea2658e52dadc83))


### Bug Fixes

* encode Windows drive letter colon in session directory name ([dcbba4d](https://github.com/maruakshay/viecodie-cli/commit/dcbba4dbab89e6f254e35fca73f7c8987e88c04a))
* encode Windows drive letter colon in session directory name ([80cacbd](https://github.com/maruakshay/viecodie-cli/commit/80cacbdc981b5ab7982ec6265aaab05c4301ad04))
* harden config/context/permissions and smooth first-run UX ([9a20ee5](https://github.com/maruakshay/viecodie-cli/commit/9a20ee5a033ef751f775f2d45e9895c424993c4b))
* harden config/context/permissions and smooth first-run UX ([67f95e3](https://github.com/maruakshay/viecodie-cli/commit/67f95e3f7bd9de1a72d04eacfd207d1cc5604611))
* **input:** paste chips for large pastes, robust paste sanitizing ([1af7ee0](https://github.com/maruakshay/viecodie-cli/commit/1af7ee0ba0a1b50769e1890eacae412326c94e70))
* **input:** paste chips for large pastes, robust paste sanitizing ([58d170b](https://github.com/maruakshay/viecodie-cli/commit/58d170bc232d54426a14ca46e3ba5550c25c0081))
* **loop:** detect repeats before committing assistant turn ([c3c8251](https://github.com/maruakshay/viecodie-cli/commit/c3c8251d31c0b01f5b2345582e40b7de785f98c2))
* **loop:** detect repeats before committing assistant turn ([dc9d8fc](https://github.com/maruakshay/viecodie-cli/commit/dc9d8fcf29edd1e6ad95243da7c3ad593086960b))
* **pkg:** correct bin path and use prepack for build ([cd98db2](https://github.com/maruakshay/viecodie-cli/commit/cd98db288c943a753575ec842a2cb71c4d429fb3))
* publish package metadata refresh (SEO description + keywords) ([f16d105](https://github.com/maruakshay/viecodie-cli/commit/f16d1059af26ad567373c6a284073e3fb2bd897a))
* surface empty/early-dropped Ollama streams ([#71](https://github.com/maruakshay/viecodie-cli/issues/71)) ([7db6168](https://github.com/maruakshay/viecodie-cli/commit/7db6168e9af902d9a96a8720fc78124986d512ba))
* **ui:** show line count header for non-grep/glob tool results ([b232c5d](https://github.com/maruakshay/viecodie-cli/commit/b232c5dd94f51c6211edeb21714d7974a371a399))
* **ui:** stop ChatView and InputBar flicker during streaming ([d7833be](https://github.com/maruakshay/viecodie-cli/commit/d7833be3f609174b4ac27b4b501fa5ef1f500280))
* **ui:** stop ChatView and InputBar flicker during streaming ([a69b98b](https://github.com/maruakshay/viecodie-cli/commit/a69b98b17cd3d847315e9484002b9ab5bcdd6ac7))
* **ui:** swallow coalesced mouse reports so they can't reach the prompt ([#81](https://github.com/maruakshay/viecodie-cli/issues/81)) ([e3fd5f6](https://github.com/maruakshay/viecodie-cli/commit/e3fd5f6167ae195e166fcef73874585e04fa2465))
* **ui:** update colors for file edit and message indicators ([9d26e77](https://github.com/maruakshay/viecodie-cli/commit/9d26e770558cb82eb24167d94eadaaeadb313fd4))
* update demo GIF path in README ([99843d9](https://github.com/maruakshay/viecodie-cli/commit/99843d9073e7cc041cdb7098411c78ca7e7f7c13))
* use native tool-calling for all Ollama models ([f67fee5](https://github.com/maruakshay/viecodie-cli/commit/f67fee5c5ac56e88e1eb2a84a0416d218218390e))

## [2.0.0](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.37...viecodie-agent-v2.0.0) (2026-09-05)


### Features

* **ui:** thinking is committed to the transcript instead of the live frame — the spinner block is a fixed two rows (spinner + the line being thought), the whole thought rides along with the turn it belongs to, and ctrl+t expands thoughts on any turn, including ones that finished long ago

## [0.1.37](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.36...viecodie-agent-v0.1.37) (2026-09-05)


### Bug Fixes

* **ui:** swallow coalesced mouse reports so they can't reach the prompt ([#81](https://github.com/maruakshay/viecodie-cli/issues/81)) ([e3fd5f6](https://github.com/maruakshay/viecodie-cli/commit/e3fd5f6167ae195e166fcef73874585e04fa2465))

## [0.1.36](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.35...viecodie-agent-v0.1.36) (2026-09-05)


### Features

* **ui:** scrollback with mouse support, and a card for user messages ([#79](https://github.com/maruakshay/viecodie-cli/issues/79)) ([d4c5461](https://github.com/maruakshay/viecodie-cli/commit/d4c5461e5d6b930ede8beeb0bbbb7d9d84aeb9ad))

## [0.1.35](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.34...viecodie-agent-v0.1.35) (2026-09-05)


### Features

* **agent:** repair near-miss tool calls and size the prompt to the window ([#74](https://github.com/maruakshay/viecodie-cli/issues/74)) ([0d3f7b8](https://github.com/maruakshay/viecodie-cli/commit/0d3f7b814bee809d6c155f6d88dedab91c66e310))
* **ui:** rework onboarding, and stop wildcard rules spanning command… ([#76](https://github.com/maruakshay/viecodie-cli/issues/76)) ([6fcc880](https://github.com/maruakshay/viecodie-cli/commit/6fcc8809dd93893118823ae2ad037cc591e3d9bc))

## [0.1.34](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.33...viecodie-agent-v0.1.34) (2026-07-04)


### Bug Fixes

* surface empty/early-dropped Ollama streams ([#71](https://github.com/maruakshay/viecodie-cli/issues/71)) ([7db6168](https://github.com/maruakshay/viecodie-cli/commit/7db6168e9af902d9a96a8720fc78124986d512ba))

## [0.1.33](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.32...viecodie-agent-v0.1.33) (2026-07-04)


### Features

* release agent personality and write_todos tooling ([#69](https://github.com/maruakshay/viecodie-cli/issues/69)) ([b4ecafd](https://github.com/maruakshay/viecodie-cli/commit/b4ecafd4a3305af59fe1189c5048029c6f55d9fb))

## [0.1.32](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.31...viecodie-agent-v0.1.32) (2026-07-03)


### Features

* **tools:** batch edits, process-tree kill, abort propagation, image read ([#66](https://github.com/maruakshay/viecodie-cli/issues/66)) ([d12e593](https://github.com/maruakshay/viecodie-cli/commit/d12e59337e1f6f04f5cdf274db5e83e9f80ecad5))

## [0.1.31](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.30...viecodie-agent-v0.1.31) (2026-07-03)


### Bug Fixes

* publish package metadata refresh (SEO description + keywords) ([f16d105](https://github.com/maruakshay/viecodie-cli/commit/f16d1059af26ad567373c6a284073e3fb2bd897a))

## [0.1.30](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.29...viecodie-agent-v0.1.30) (2026-07-02)


### Bug Fixes

* harden config/context/permissions and smooth first-run UX ([9a20ee5](https://github.com/maruakshay/viecodie-cli/commit/9a20ee5a033ef751f775f2d45e9895c424993c4b))
* harden config/context/permissions and smooth first-run UX ([67f95e3](https://github.com/maruakshay/viecodie-cli/commit/67f95e3f7bd9de1a72d04eacfd207d1cc5604611))
* **loop:** detect repeats before committing assistant turn ([c3c8251](https://github.com/maruakshay/viecodie-cli/commit/c3c8251d31c0b01f5b2345582e40b7de785f98c2))
* **loop:** detect repeats before committing assistant turn ([dc9d8fc](https://github.com/maruakshay/viecodie-cli/commit/dc9d8fcf29edd1e6ad95243da7c3ad593086960b))

## [0.1.29](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.28...viecodie-agent-v0.1.29) (2026-06-29)


### Features

* add demo GIF to showcase functionality ([64188ff](https://github.com/maruakshay/viecodie-cli/commit/64188ffc8f24fdf5ac830cf4262b34b847babecf))
* add demo GIF to showcase functionality ([b44eb65](https://github.com/maruakshay/viecodie-cli/commit/b44eb651cf5e718b05ff8ac0514a9a1f6a66941b))

## [0.1.28](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.27...viecodie-agent-v0.1.28) (2026-06-29)


### Features

* reflect session summary in terminal tab title ([341eb89](https://github.com/maruakshay/viecodie-cli/commit/341eb89c3de2794dec2765393cf59de8d7ac9641))
* reflect session summary in terminal tab title ([9ea2bd0](https://github.com/maruakshay/viecodie-cli/commit/9ea2bd02d5be9bcae297a00c70c1255062ee08ee))

## [0.1.27](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.26...viecodie-agent-v0.1.27) (2026-06-29)


### Features

* background auto-update and leaked tool-call recovery ([71a1094](https://github.com/maruakshay/viecodie-cli/commit/71a109422ddff9ad5836e53333fd5a0a534f493b))
* background auto-update and leaked tool-call recovery ([111dfab](https://github.com/maruakshay/viecodie-cli/commit/111dfabe183c89b2303cb781a85265709a23e09e))

## [0.1.26](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.25...viecodie-agent-v0.1.26) (2026-06-29)


### Features

* image paste for vision models ([c8627ae](https://github.com/maruakshay/viecodie-cli/commit/c8627aef640edbedc9e0a1bdda17f9ca6a43ed4d))
* image paste for vision models ([8a35a57](https://github.com/maruakshay/viecodie-cli/commit/8a35a5757cd781fc70dde45548283380a4b46902))

## [0.1.25](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.24...viecodie-agent-v0.1.25) (2026-06-26)


### Features

* add terminal hard-clear functionality and enhance command handling in useKeyboard ([e47136e](https://github.com/maruakshay/viecodie-cli/commit/e47136ea765e54b1aac32498dd6783e63e8a7d36))
* enhance chat function to support reasoning models and improve ThinkingBlock layout handling ([d1b18a9](https://github.com/maruakshay/viecodie-cli/commit/d1b18a997170c068f6151d6f7a30bce5065b9d0a))

## [0.1.24](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.23...viecodie-agent-v0.1.24) (2026-06-26)


### Bug Fixes

* use native tool-calling for all Ollama models ([f67fee5](https://github.com/maruakshay/viecodie-cli/commit/f67fee5c5ac56e88e1eb2a84a0416d218218390e))

## [0.1.23](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.22...viecodie-agent-v0.1.23) (2026-06-26)


### Bug Fixes

* use native tool-calling for all Ollama models ([f67fee5](https://github.com/maruakshay/viecodie-cli/commit/f67fee5c5ac56e88e1eb2a84a0416d218218390e))

## [0.1.22](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.21...viecodie-agent-v0.1.22) (2026-06-25)


### Features

* enhance grammar usage for Ollama tool-calling based on model pa… ([a7a4559](https://github.com/maruakshay/viecodie-cli/commit/a7a455929ab27189e142235077cbfeb6385ed47e))
* enhance grammar usage for Ollama tool-calling based on model parameters ([b0955ca](https://github.com/maruakshay/viecodie-cli/commit/b0955caa066b4333c578c20db6d60257b42a9706))

## [0.1.21](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.20...viecodie-agent-v0.1.21) (2026-06-25)


### Features

* native tool-calling + truncation guards for local models ([cc7a17d](https://github.com/maruakshay/viecodie-cli/commit/cc7a17dea10aa9700997e36eb4b264d43ea03b5b))
* native tool-calling + truncation guards for local models ([d0ad200](https://github.com/maruakshay/viecodie-cli/commit/d0ad200667289735141d326393e84075e2c04f86))

## [0.1.20](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.19...viecodie-agent-v0.1.20) (2026-06-25)


### Features

* add GitHub Pages landing site with live changelog ([023363f](https://github.com/maruakshay/viecodie-cli/commit/023363f5313fae2c6bcca4ef8c9a69f82f6c1374))
* enhance landing page with updated descriptions, improved styles, and new features section ([85b905c](https://github.com/maruakshay/viecodie-cli/commit/85b905c45f84763b0ff421116c5bcfe42ab525b3))
* enhance UI/UX with markdown rendering, input history, and improved layout ([f5aa1ae](https://github.com/maruakshay/viecodie-cli/commit/f5aa1aec58b50df8e631666c9c789ead7f9da242))
* update README and package description for clarity and emphasis on local-first AI capabilities ([793b257](https://github.com/maruakshay/viecodie-cli/commit/793b257f02a279bbb42498a19ea2658e52dadc83))

## [0.1.19](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.18...viecodie-agent-v0.1.19) (2026-06-24)


### Features

* implement grammar-constrained actions and generalized permissions ([41742f4](https://github.com/maruakshay/viecodie-cli/commit/41742f49683837158bf4d88baffcfd346383f88f))
* implement grammar-constrained actions and generalized permissions ([2d5ec6b](https://github.com/maruakshay/viecodie-cli/commit/2d5ec6bf8a694513bc3ccaf3df3ddfc9666e53bc))

## [0.1.18](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.17...viecodie-agent-v0.1.18) (2026-06-23)


### Features

* **grep:** add context, files_only, type, multiline, count, fixed_strings ([9098f0b](https://github.com/maruakshay/viecodie-cli/commit/9098f0bd18e7099704215bee90240749771cec26))
* refine agent personality and update processing labels ([1462bc7](https://github.com/maruakshay/viecodie-cli/commit/1462bc7f63033b5efda27827dedb60298f18ea4d))
* refine agent personality and update processing labels ([8ffbc47](https://github.com/maruakshay/viecodie-cli/commit/8ffbc47ca7b7e3db42f16e55a6aab08195222319))


### Bug Fixes

* **ui:** show line count header for non-grep/glob tool results ([b232c5d](https://github.com/maruakshay/viecodie-cli/commit/b232c5dd94f51c6211edeb21714d7974a371a399))

## [0.1.17](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.16...viecodie-agent-v0.1.17) (2026-06-22)


### Features

* **session:** summarize first exchange into title ([b8fe10c](https://github.com/maruakshay/viecodie-cli/commit/b8fe10c649bcc5409b52de576cd70b9d74eef8f1))
* **session:** summarize first exchange into title ([768b66a](https://github.com/maruakshay/viecodie-cli/commit/768b66a0304f9c9dfbf8f7e6a6bf9529dd66136b))

## [0.1.16](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.15...viecodie-agent-v0.1.16) (2026-06-22)


### Features

* **prompt:** read project VIECODIE.md into system prompt ([bc01133](https://github.com/maruakshay/viecodie-cli/commit/bc011336705de27737f33cf716f19f284b10f7a4))
* **prompt:** read project VIECODIE.md into system prompt ([88abb2f](https://github.com/maruakshay/viecodie-cli/commit/88abb2fe226593efb7c9d867d6c67816e0e8d828))


### Bug Fixes

* **input:** paste chips for large pastes, robust paste sanitizing ([1af7ee0](https://github.com/maruakshay/viecodie-cli/commit/1af7ee0ba0a1b50769e1890eacae412326c94e70))
* **input:** paste chips for large pastes, robust paste sanitizing ([58d170b](https://github.com/maruakshay/viecodie-cli/commit/58d170bc232d54426a14ca46e3ba5550c25c0081))
* **ui:** update colors for file edit and message indicators ([9d26e77](https://github.com/maruakshay/viecodie-cli/commit/9d26e770558cb82eb24167d94eadaaeadb313fd4))

## [0.1.15](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.14...viecodie-agent-v0.1.15) (2026-06-19)


### Features

* **ui:** syntax-highlight diffs, fix modal overflow, firm update banner ([a06eb26](https://github.com/maruakshay/viecodie-cli/commit/a06eb26d2dbdc01fa549e86c1a5aa017cfea14cb))
* **ui:** syntax-highlight diffs, fix modal overflow, firm update banner ([634b77d](https://github.com/maruakshay/viecodie-cli/commit/634b77d2ab64f8ce057576c870a0ecb22ad3dc25))


### Bug Fixes

* **ui:** stop ChatView and InputBar flicker during streaming ([d7833be](https://github.com/maruakshay/viecodie-cli/commit/d7833be3f609174b4ac27b4b501fa5ef1f500280))
* **ui:** stop ChatView and InputBar flicker during streaming ([a69b98b](https://github.com/maruakshay/viecodie-cli/commit/a69b98b17cd3d847315e9484002b9ab5bcdd6ac7))

## [0.1.14](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.13...viecodie-agent-v0.1.14) (2026-06-16)


### Features

* unified named-provider config with opencode-style picker ([88cadfe](https://github.com/maruakshay/viecodie-cli/commit/88cadfeaa780fa656016096ffdcfc32581acf5d8))
* unified named-provider config with opencode-style picker ([f4dc609](https://github.com/maruakshay/viecodie-cli/commit/f4dc6098d852a8488d77f8614bd0d9f291862798))


### Bug Fixes

* encode Windows drive letter colon in session directory name ([dcbba4d](https://github.com/maruakshay/viecodie-cli/commit/dcbba4dbab89e6f254e35fca73f7c8987e88c04a))
* encode Windows drive letter colon in session directory name ([80cacbd](https://github.com/maruakshay/viecodie-cli/commit/80cacbdc981b5ab7982ec6265aaab05c4301ad04))

## [0.1.13](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.12...viecodie-agent-v0.1.13) (2026-06-11)


### Features

* **ui:** full-width diff bg with right margin; polish README ([995a549](https://github.com/maruakshay/viecodie-cli/commit/995a549085a948bb8c89878ab6ec63d35499f030))
* **ui:** full-width diff bg with right margin; polish README ([b2d51b7](https://github.com/maruakshay/viecodie-cli/commit/b2d51b7df92de0e9bf9846726f159af372f4a716))

## [0.1.12](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.11...viecodie-agent-v0.1.12) (2026-06-11)


### Features

* **ui/tools:** ctrl+o expand, diff bg highlight, fuzzy edit, verify nudge ([b3a32e3](https://github.com/maruakshay/viecodie-cli/commit/b3a32e3f037e31ab264d0b8bbc72129fa42f7e3f))
* **ui/tools:** ctrl+o expand, diff bg highlight, fuzzy edit, verify nudge ([7e57ac2](https://github.com/maruakshay/viecodie-cli/commit/7e57ac2fb162a0cea6c54bb34340691aae7f7560))

## [0.1.11](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.10...viecodie-agent-v0.1.11) (2026-06-10)


### Features

* **tools:** lossless output spill, ranged reads, smarter edit/glob ([8e6ef83](https://github.com/maruakshay/viecodie-cli/commit/8e6ef831da6490a702dc2c2ac8837b3c7ac42eda))
* **tools:** lossless output spill, ranged reads, smarter edit/glob ([69d19b5](https://github.com/maruakshay/viecodie-cli/commit/69d19b58bb987f4553226229fd964b330cde57c8))

## [0.1.10](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.9...viecodie-agent-v0.1.10) (2026-06-09)


### Features

* **cli:** self-update command, auto-allow read-only tools, always em… ([1d89911](https://github.com/maruakshay/viecodie-cli/commit/1d89911d5b28d4c257e62c522c821855c1345abe))
* **cli:** self-update command, auto-allow read-only tools, always emit exit code ([a3fd8c1](https://github.com/maruakshay/viecodie-cli/commit/a3fd8c154d6254fe47f79bda1d2f0e7b8716922e))

## [0.1.9](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.8...viecodie-agent-v0.1.9) (2026-06-08)


### Features

* **eval:** add model eval harness and `viecodie doctor` ([6a62680](https://github.com/maruakshay/viecodie-cli/commit/6a62680e8dfb5549a66e252abda0e5ffc06481cb))
* **eval:** add model eval harness and `viecodie doctor` ([ac3baa4](https://github.com/maruakshay/viecodie-cli/commit/ac3baa4c64e75234f97e46e18c1a0bd657c16c2c))

## [0.1.8](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.7...viecodie-agent-v0.1.8) (2026-06-08)


### Features

* **security:** input validation, path confinement, persistent permissions ([f800a6c](https://github.com/maruakshay/viecodie-cli/commit/f800a6c15234fa12238879a49da1d8d573edd197))

## [0.1.7](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.6...viecodie-agent-v0.1.7) (2026-06-07)


### Features

* **session:** store sessions globally per-project like Claude Code ([690eaa0](https://github.com/maruakshay/viecodie-cli/commit/690eaa069d99ece77ddfe1ad0d8dc3d835ce95e4))

## [0.1.6](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.5...viecodie-agent-v0.1.6) (2026-06-07)


### Features

* **ui:** handle missing/stopped ollama gracefully ([bda0da3](https://github.com/maruakshay/viecodie-cli/commit/bda0da37f2b2eb697ffe4bfc810efeea9f920b64))

## [0.1.5](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.4...viecodie-agent-v0.1.5) (2026-06-07)


### Features

* **ui:** add sessions view and align command palette descriptions ([8d052d7](https://github.com/maruakshay/viecodie-cli/commit/8d052d7dc58687b8c49e88d35f11c9d74cf71ec1))

## [0.1.4](https://github.com/maruakshay/viecodie-cli/compare/viecodie-agent-v0.1.3...viecodie-agent-v0.1.4) (2026-06-07)


### Features

* add npm package + release-please automation ([60b48df](https://github.com/maruakshay/viecodie-cli/commit/60b48dfbaec822f81b3bebf538f7f38c79facd5f))
* implement update check functionality in App component ([6e6ec62](https://github.com/maruakshay/viecodie-cli/commit/6e6ec62d6681d829cafd12d2f0f0b768c48798d5))
* **prompt:** add goal-understanding and attention re-attend system ([61cadf1](https://github.com/maruakshay/viecodie-cli/commit/61cadf133d84dd9cb4fb889e01113609dcdfe991))
* **ui:** change thinking toggle shortcut to ctrl+t ([97be0cd](https://github.com/maruakshay/viecodie-cli/commit/97be0cdc805bb0e97e52923152d298bfc613a3c9))
* **ui:** polish permission prompt, unify cursor glyphs, add empty state ([815bab2](https://github.com/maruakshay/viecodie-cli/commit/815bab2f259b95fdc277b1533fa3ab09e590b721))


### Bug Fixes

* **pkg:** correct bin path and use prepack for build ([cd98db2](https://github.com/maruakshay/viecodie-cli/commit/cd98db288c943a753575ec842a2cb71c4d429fb3))
* update demo GIF path in README ([99843d9](https://github.com/maruakshay/viecodie-cli/commit/99843d9073e7cc041cdb7098411c78ca7e7f7c13))

## [0.1.3](https://github.com/maruakshay/viecodie-cli/compare/viecodie-cli-v0.1.2...viecodie-cli-v0.1.3) (2026-06-06)


### Features

* **prompt:** add goal-understanding and attention re-attend system ([61cadf1](https://github.com/maruakshay/viecodie-cli/commit/61cadf133d84dd9cb4fb889e01113609dcdfe991))

## [0.1.2](https://github.com/maruakshay/viecodie-cli/compare/viecodie-cli-v0.1.1...viecodie-cli-v0.1.2) (2026-06-06)


### Features

* **ui:** change thinking toggle shortcut to ctrl+t ([97be0cd](https://github.com/maruakshay/viecodie-cli/commit/97be0cdc805bb0e97e52923152d298bfc613a3c9))


### Bug Fixes

* **pkg:** correct bin path and use prepack for build ([cd98db2](https://github.com/maruakshay/viecodie-cli/commit/cd98db288c943a753575ec842a2cb71c4d429fb3))

## [0.1.1](https://github.com/maruakshay/viecodie-cli/compare/viecodie-cli-v0.1.0...viecodie-cli-v0.1.1) (2026-06-05)


### Features

* add npm package + release-please automation ([60b48df](https://github.com/maruakshay/viecodie-cli/commit/60b48dfbaec822f81b3bebf538f7f38c79facd5f))
