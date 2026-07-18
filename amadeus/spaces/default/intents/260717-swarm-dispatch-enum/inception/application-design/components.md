# Components — swarm-dispatch-enum(Issue #1157)

上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

本 intent は新規サービスを追加しない brownfield 変更であり、コンポーネントは「既存資産への変更セット」として定義する(`component-inventory.md` の既存台帳と `architecture.md` の swarm seam を基底に、`requirements.md` FR-1〜FR-10 を配置する)。

## C1: Driver Contract(`packages/framework/core/tools/amadeus-swarm.ts`)

- 責務: 三値 driver 語彙(`subagent` / `claude-ultra` / `codex-ultra`)の唯一の型定義と、raw env+harness からの決定的解決(selected driver / degraded-from / fail-closed error)。FR-1/FR-2/FR-4/FR-6 を所有
- 変更: `DriverName`(:88)と `DRIVER_VALUES`(:89)を三値へ置換(`ultracode` 撤去)。`--degraded-from` 検証(:402-407)は新語彙で継続。解決境界の実現形 = `resolve` サブコマンド新設+exported 純関数(Q1 裁定 A、E-SDE-AD 2026-07-18T00:05:37Z 採用 3/3 全 GoA 1・留保 0 件)
- 公開面: `amadeus-swarm.ts resolve --harness <claude|codex|kiro|kiro-ide>`(env 読み → JSON stdout、正常 exit 0 / fail-closed exit 1)+ exported 純関数 `resolveDriver`(in-process テスト seam)。main の 3 サブコマンド switch への第4 case 追加は FR-7 意味論に非干渉な加算(裁定根拠)
- 境界: referee 3 サブコマンド(prepare/check/finalize)の意味論は不変(FR-7)。C1 は語彙と解決のみを追加する

## C2: Degradation Audit(`amadeus-swarm.ts` emit 面+`amadeus-audit.ts`)

- 責務: `SWARM_DEGRADED` の Requested driver を三値語彙で記録(FR-3/NFR-1)。audit イベント enum(amadeus-audit.ts:147-152、6 イベント)は**変更しない** — 変更は emit 側の値域のみ
- 変更: `emitSwarmDegraded`(:285)の Requested driver 型を三値 `DriverName` に追随。Fallback driver `"subagent"` ハードコード(:293)は維持(ADR-3)

## C3: Claude Conductor Wiring(`packages/framework/harness/claude/skills/amadeus/SKILL.md:61`)

- 責務: FR-1 表の Claude 行の prose 配線 — unset=native floor(N 並列 Task)/ `claude-ultra`=Dynamic Workflow(tool 不在時 loud-degrade)/ `codex-ultra`=loud-degrade / `1`・未知値=fail-closed。dispatch 前の機械検証手順 = `resolve --harness claude` の実行(exit 1 なら停止、出力 driver に従う — Q1 裁定 A)

## C4: Codex Conductor Wiring(`packages/framework/harness/codex/skills/amadeus/SKILL.md:57,171`+`emit.ts:81`+`onboarding.fills.ts:42,55`)

- 責務: FR-5 — headless `codex exec` per-unit floor の撤去と、同一セッション内 native subagent 並列 fan-out への置換(spawn・回収・retry。C-13/C-14 evidence 済み)。`codex-ultra`=native subagent+reasoning effort 指定(受理+完了を証拠限界とする — NFR-2)。`claude-ultra`=loud-degrade / `1`・未知値=fail-closed
- retry identity と wave 挙動の詳細契約は Functional Design へ(C-18/C-17 — register 明記の委任)

## C5: Kiro Consumer Sync(`harness/kiro/` と `harness/kiro-ide/` の SKILL.md+onboarding.fills.ts 各1箇所)

- 責務: FR-8 — unset の既存 native floor 維持、両 ultra 値 loud-degrade、`1`・未知値 fail-closed、旧 `1` 記述の除去。新 driver は追加しない

## C6: Docs Sync(`docs/harness-engineering/08-construction-and-swarm.md:201-213`、`docs/reference/17-skill-system.md:108-122`、harness ガイド `.md`/`.ja.md` 対)

- 責務: FR-10 — driver seam 表の三値化、breaking removal(旧 `1`)、Codex floor 変更、C-15 開示。opencode/cursor の1行言及は既存 08 節へ追記限定(FR-9 留保)

## C7: Test Surface(`tests/` — t134/t135/t207/t211/t28/t181 ほか)

- 責務: FR-1 表の全セル機械検証(matrix)、FR-2 negative(副作用ゼロ)、FR-3 degrade audit 一致、FR-7 referee 回帰、t181 SKILL parity、t28 audit enum 同期。coverage patch gate 対応(local lcov 事前確認)

## C8: Generated Assets(`dist/<harness>/` ×6+self-install ツリー)

- 責務: FR-10/S-09 — `bun scripts/package.ts`+`bun run promote:self` による既存生成経路の同期のみ。手編集禁止(Forbidden 承継)
