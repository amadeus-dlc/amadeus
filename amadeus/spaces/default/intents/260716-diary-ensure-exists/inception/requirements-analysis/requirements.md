# Requirements — diary-ensure-exists(Issue #1080)

> 上流入力: Issue #1080(クロスレビュー2名 — e4 1人目 09:22Z 訂正2点+e2 2人目 09:19Z)、E-1080-FIX 裁定(B 採用 4/4、留保3点)、RE scan-notes(STAGE_STARTED 5経路列挙・生成コード不在の反証 grep・choke point 接地)、codekb `code-structure.md`「ステージ diary 生成機構の観測」節。`business-overview.md` / `architecture.md` はエンジン記録層のみの bugfix につき非交差 — scan-notes と code-structure 当該節を上流の正とする。
> 既決照合: 修正方式 = E-1080-FIX 裁定 B(engine ensure-exists)。挿入点 = run-stage directive 発行時(裁定が採用した Issue 候補2の原文どおり。「または gate-start」分岐は RE 実測 — gate-start は state:1657 の [-]→[?] 遷移 = ステージ末尾儀式 — により不適合確定)。明確化質問 0問(questions 冒頭の判定参照)。

## FR-1: run-stage directive 発行時の diary ensure-exists

`amadeus-orchestrate.ts` の run-stage directive 構築(memory_path 算出 :1162 近傍)で、`memory_path` の実ファイルが不在の場合に `knowledge/amadeus-shared/memory-template.md` の内容で生成する。

- AC-1a: **冪等 — 既存 memory.md を絶対に上書きしない**(resume / re-entry / 再 next の蓄積保全。conductor.md「Idempotent — never overwrite」:69 の意味論を engine 側でも保存)【裁定留保(1)】
- AC-1b: テンプレート解決は **harness dir 解決**(`deriveHarnessDir()`、amadeus-lib.ts:131 — 是正時再実測済み)系で `<harness>/knowledge/amadeus-shared/memory-template.md` を引く(conductor.md の copy 元と同一パス)。**sensor の `memoryTemplatesDir` は space 相対(`amadeus/spaces/<space>/memory/templates`、amadeus-graph.ts:264)の別解決であり流用しない**(Issue #1080 本文の「別用途」判定どおり)。採用する解決関数の最終確定は実装時に再実測(fix-diff-independent-reverify)。テンプレート不在時は**生成をスキップして directive 発行を続行**(diary は観測層 — 生成失敗でワークフローを止めない。ただし無音にせず stderr へ1行警告 = 検証劇場 Forbidden の無音 fail-open 回避)
- AC-1c: 適用経路は run-stage directive を発行する全経路(advance / jump / birth 後の next / resume 後の next / `--single`)— RE 列挙の STAGE_STARTED 5経路のうち initialization ブートストラップ3ステージ(utility:2511/2575/2596)は run-stage directive を経由しないため対象外(従来も diary 不在で実害なし — 本 requirements で明文化)
- AC-1d: 生成される内容は memory-template.md と byte 一致(t100 の INVARIANT 様式 — 新テンプレートを発明しない)

## FR-2: 落ちる実証(新設機構、Mandated)【裁定留保(2)】

- AC-2a: **不在→生成**分岐: memory.md 不在の record で next を実行し、テンプレート内容で生成されることをテストで検証
- AC-2b: **既存→非上書き**分岐: 蓄積エントリ入りの memory.md を置いて next を実行し、byte 不変であることをテストで検証(上書き注入で赤くなることの実証を含む — 実装を一時的に無条件 copy へ変えてテストが FAIL することを確認してから戻す、または同等の削除注入)
- AC-2c: テストは in-process seam で駆動(bun-coverage-spawn-blindspot / seam-placement-measured-module — orchestrate は既計測モジュールか実装時に registry で実測確認し、spawn-only なら seam 関数を適切に配置)

## FR-3: docs 整合(同一変更)【裁定留保(3)】

- AC-3a: `CLAUDE.md:50` / `.claude/CLAUDE.md:41` の「auto-created from a template at stage start and maintained by the orchestrator」は B 実装後に**そのまま真** — 文言維持を確認(変更不要の確認も整合確認の実測に含める)
- AC-3b: `conductor.md:62-75` の copy 手順を「engine が run-stage directive 発行時に生成する。不在時(テンプレート欠落等)のみ fallback で copy」へ更新(概念移動 grep: conductor.md / stage-protocol.md:941 / CLAUDE.md ×2 の4記述を同一変更で棚卸し — functional-design:c3)
- AC-3c: `stage-protocol.md:941`「(created at stage start if absent)」は engine 生成後も真につき維持可 — 実装時に文脈を読み判断し、変更する場合は理由を code-summary に記録

## FR-4: 検証(既存ゲート準拠)

- AC-4a: `bun run typecheck` / `bun run lint` exit 0
- AC-4b: 正本編集(core/tools + core/amadeus-common)後 `bun scripts/package.ts` + `bun run promote:self` で全ツリー同期、`bun run dist:check` / `bun run promote:self:check` exit 0(Mandated)
- AC-4c: `bash tests/run-tests.sh --smoke` green + 関連テスト(t100 template ガード、orchestrate 系)green。push 前にローカル lcov で diff 追加行の未カバー 0 を実測(local-lcov-pre-push — 配線行・catch 行の個別確認含む)
- AC-4d: 実環境実演: 本 intent の次ステージ(code-generation)の next 実行で diary が自動生成されることを実測(dogfooding — 生成物が本 intent の record に現れる)

## FR-5: クローズ条件

- AC-5a: PR マージ後、着地面 grep(ensure-exists コードの main 実在)→ Issue #1080 手動クローズ+in-progress:amadeus ラベル除去(close-after-landing-verification)

## トレーサビリティ

| 要件 | 由来 |
|------|------|
| FR-1 | Issue #1080 修正候補2 + E-1080-FIX 裁定 B + RE の choke point 接地(5経路列挙・gate-start 不適合) |
| FR-2 | 裁定留保(2)+ org/team Mandated「落ちる実証」 |
| FR-3 | 裁定留保(3)+ functional-design:c3(概念移動の全成果物 grep) |
| FR-4 | project.md Mandated(dist 同期・検証コマンド)+ local-lcov-pre-push |
| FR-5 | close-after-landing-verification + Issue 可視化運用 |

## スコープ外(明示)

- initialization ブートストラップ3ステージへの diary 導入(AC-1c の根拠どおり対象外 — 必要が生じたら別 Issue)
- §13 surface / runtime summary 側の diary パース変更(生成内容はテンプレート byte 一致につき影響なし)
- C 案(不在警告の検出機構)— 裁定で非採用
