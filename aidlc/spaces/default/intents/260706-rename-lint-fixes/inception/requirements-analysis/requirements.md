# Requirements（260706-rename-lint-fixes）

対象 Issue: [#537](https://github.com/amadeus-dlc/amadeus/issues/537)（scope-table の旧パス ENOENT）、[#540](https://github.com/amadeus-dlc/amadeus/issues/540)（learnings の sensors 旧名解決）、[#538](https://github.com/amadeus-dlc/amadeus/issues/538)（linter sensor の実質 no-op）

## 意図分析

rename 漏れ 2 件（#537/#540 = #445 engine-namespace 改名の取りこぼし）と、linter sensor の文書・実態乖離（#538）を 1 Intent で解消する。3 件とも gate・運用の信頼性に関わる小粒のエンジン隣接 bug である。現行構造の把握は [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)（エンジン 26 CLI・sensor 機構）、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)（lints/ ハーネス・dev-scripts 境界）、[codekb/amadeus/api-documentation.md](../../../../codekb/amadeus/api-documentation.md)（utility verb 一覧）を上流入力として参照する。

実測済みの現状（conductor 調査、Issue 記載と一致）:

- #537: `amadeus-utility.ts` の `skillMdPath()` が `join(TOOLS_DIR, "..", "skills", "aidlc", "SKILL.md")` を組み立て、`.agents/amadeus/skills/aidlc/SKILL.md`（不在）を参照して ENOENT。scope-table（render）は動くが `--check` が完走しない。
- #540: `amadeus-learnings.ts:84` が `aidlc-${sensorId}.md` で sensors を解決するが、実ファイルは `.agents/amadeus/sensors/amadeus-*.md` の 4 件。learnings の sensor 連携経路が無言で解決失敗する。
- #538: `amadeus-sensor-linter.ts` は `bunx eslint` をラップし、eslint 設定不在時は exit 127 → dispatcher が quiet PASS（tool-unavailable）へ再分類する設計的 no-op。本リポジトリの実 linter は `lints/check.ts`（独自ハーネス、`npm run lint:check`）であり、gate 時に実 rule が効かない。

## 機能要求

- FR-1（#537、B001）:
  - FR-1.1: `skillMdPath()` の解決先を実在パス（リポジトリの `skills/amadeus/SKILL.md`）へ修正し、`scope-table` / `scope-table --check` が exit 0 で完走する。
  - FR-1.2: 旧名 `aidlc-*` の path 断片が tools 内に残っていないかの全 tools 走査型回帰検査（#507 の import.meta.main 走査と同型）を eval に常設する。既知の正当な旧名参照（parity の nameMappings 対象トークン、v2 成果物名 `aidlc-state.md` 等）は許可リストで宣言する。
  - FR-1.3: `scope-table --check` の CI（test:all）組み込み要否を設計で判断し、判断根拠を記録する。
- FR-2（#540、B002）:
  - FR-2.1: `amadeus-learnings.ts` の sensors 解決パターンを `amadeus-${sensorId}.md` へ修正し、実在 sensor（linter / required-sections / type-check / upstream-coverage）のファイル解決が成功する。
  - FR-2.2: sensors 実ファイル走査の回帰検査を FR-1.2 の eval と同居または同型で常設する。
- FR-3（#538、B003）:
  - FR-3.1: linter sensor の文書記述と実行時挙動を一致させ、SENSOR_FIRED の意味を明確にする（Issue 受け入れ条件）。
  - FR-3.2: 実現形は候補 1 を基本線に functional-design で確定する（Q4）。設計制約: エンジンは配布物であり、repo 固有パス（`lints/check.ts`）の直書きは「repo の開発用スクリプトを skill の実行時参照として書かない」規則と衝突するため、対象 workspace から機械検出できる汎用機構（例: package.json の `lint:check` script の存在検出 → ラップ、不在なら従来の quiet PASS）を検討する。
  - FR-3.3: #528 の新 rule（no-stub-compat）が gate 時に自動で効くこと（engineer3 ピア確認済みの効果）を検証で確認する。検証手段（eval の入力・出力仕様。例: no-stub パターンを含む入力で sensor が fail を返すことの隔離 workspace 検査）は、#528 の rule 実装が確定してから functional-design で受け入れ条件として定義する（明示委任。#528 が未 merge のため要求段階では仕様を固定できない）。
- FR-4（共通）:
  - FR-4.1: エンジン変更は parity-map の engineFileExceptions 宣言（新規または既存 reason の更新）と skills/ 正準ソース反映を伴う。
  - FR-4.2: TDD — 各 Bolt で先に失敗する eval を追加し、RED を確認してから修正する。

## 非機能要求

- NFR-1: Bolt 3 本は同一 worktree 内で直列に実行する（並行運用ポリシー）。
- NFR-2: B003 の着手は engineer3 の #528 PR の merge 後とし、rebase で追従する（ピア確認済みの順序）。
- NFR-3: 成果物・PR は日本語、TS は英語（Skill Language Policy）。
- NFR-4: 変更は Issue が要求する箇所に限定する（Surgical Changes。sensor 機構の再設計はしない）。

## 受け入れ条件（Issue AC と対応）

| # | 受け入れ条件 | 対応要求 |
|---|---|---|
| 1 | `scope-table --check` が exit 0 で完走し、先に失敗する eval がある（#537 AC） | FR-1.1 / FR-1.2 / FR-4.2 |
| 2 | sensors のファイル名解決が実ファイルと一致し、先に失敗する eval がある（#540 AC） | FR-2.1 / FR-2.2 / FR-4.2 |
| 3 | linter sensor の文書と挙動が一致し SENSOR_FIRED の意味が明確で、先に失敗する eval を伴う（#538 AC） | FR-3.1 / FR-3.2 / FR-4.2 |
| 4 | エンジン変更に parity 宣言と skills/ 正準反映が伴う（#538/#540 AC） | FR-4.1 |
| 5 | `npm run test:all` pass、validator（260706-rename-lint-fixes 指定）pass | 全要求 |
| 6 | #528 rule の gate 時有効化の具体的検証仕様（eval の入力・出力）が functional-design で受け入れ条件として定義され、設計 gate で確定している | FR-3.3 |

## スコープ外

- eslint の正式導入（Issue #538 候補 3。npm 依存方針と衝突）。
- sensor dispatcher（amadeus-sensor.ts）の機構再設計。
- lints/ ハーネス自体の変更（#528 = engineer3 の領分）。
