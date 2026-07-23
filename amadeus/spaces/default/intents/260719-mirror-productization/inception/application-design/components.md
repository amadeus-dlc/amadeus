# Components — 260719-mirror-productization

上流入力(consumes 全数): requirements.md、architecture.md、component-inventory.md、team-practices.md

## コンポーネント一覧(規模の正当化 = 数値行数見積り付き)

| ID | コンポーネント | 所在 | 新規/変更 | 見積り規模 | 根拠 FR |
|---|---|---|---|---|---|
| C1 | amadeus-mirror ツール | `packages/framework/core/tools/amadeus-mirror.ts` | 移設+status verb 追加 | 移設 373行(挙動不変)+status 約80-120行 | FR-1/FR-2 |
| C2 | /amadeus-mirror SKILL | `packages/framework/core/skills/amadeus-mirror/SKILL.md`(正本1定義+{{HARNESS_DIR}} 置換 — ADR-6 裁定 A) | 新規 | 約40-60行(薄い runner) | FR-3 |
| C3 | 3層 config リゾルバ | `packages/framework/core/tools/amadeus-mirror-config.ts`(JSON 3面 — ADR-4 裁定 A) | 新規 | 約120-180行(パーサ+3層解決+テストシーム) | FR-4 |
| C4 | phase 境界ミラー分岐 | `packages/framework/core/tools/amadeus-orchestrate.ts`(next の phase boundary 経路) | 変更 | 約60-100行(ask/print 分岐+C3 呼出) | FR-5/FR-6 |
| C5 | ノルム改定 | `amadeus/spaces/default/memory/project.md`(gh-scripts-boundary cid) | 変更(norm PR) | 文言改定のみ(コードなし) | FR-7 |

規模合計見積り: 新規+変更 約300-460行(移設分を除く)。intent 規模バジェットの明示はなし — Bolt 分割(D-08: Bolt 1 = C1+C2 縦スライス、Bolt 2+ = C3→C4)で漸進着地。

## Reuse Inventory(新設の既存代替確認 — absence-claim-grep-verify 追補準拠の対称 grep 実施)

- **C1**: 既存 scripts 版 373行を無変更移設(新規実装ゼロ)。status verb は既存 `buildSnapshot`(:111-156)の読取面を再利用し、gh read 系(`issue view`)呼出を `spawnGh` 既存シームで追加
- **C2**: session skills 様式(amadeus-session-cost 等)の既習形を再利用 — 新規機構ゼロ
- **C3**: 「既存に無い」確認済み — 読み側 grep: `amadeus-settings.ts` は space 単層のみ(RE scan-notes (4)、`load` :129)。書き側 grep: config 書込機構は現存なし(settings.json は手編集前提)。3層解決は真の新設。ただしパーサの fail-closed 様式(unknownKeyError/typeMismatchError `amadeus-settings.ts:43-47`)は流用
- **C4**: phase boundary 検出は既存 `verifyPhaseCheckArtifact`/`PHASE_CHECK_REQUIRED_PHASES`(`amadeus-state.ts:165-196`)を判定源として再利用 — 新規の境界判定機構は作らない
- **adapter・外部契約の先行着地なし**: 全コンポーネントは本 intent 内で実装+配線が揃う(inception.md 規模ルール準拠)

## 各コンポーネントの責務

### C1: amadeus-mirror ツール(移設+status)

- 既存3 verb(create/sync/close)の CLI 契約・出力・exit code・`GhRunner` シーム・fail-closed landing check を**挙動不変**で移設(FR-1/W-04)
- 新規 `status` verb: 読取専用の乖離3クラス診断(状態行 stale / ミラー未作成 / Issue 手動変更)。exit 0=乖離なし / 1=乖離あり / 2=前提エラー(E-MPRRA3 裁定 A)
- 書込ゼロ(status): gh read 系のみ、state/record 書込なし

### C2: /amadeus-mirror SKILL

- 入口 = status 実行 → 診断結果に応じ create/sync/close へ分岐案内(FR-3 受け入れ基準 (c))
- ロジック非保持: 実行コマンドは `{{HARNESS_DIR}}/tools/amadeus-mirror.ts` のみ(FR-3 受け入れ基準 (b))
- `user-invocable: true`、`classification` は read-only ではない(S-03 — create/close へ分岐案内するため)

### C3: 3層 config リゾルバ

- Global(amadeus/ 直下)→ Space → Intent の3層を下位優先(Intent 最優先 — C-06)で解決する汎用機構。初キー `auto-mirror`(boolean、default off)
- fail-closed パース: 未知キー・型不整合は invalid 収集し loud 拒否(FR-4 受け入れ基準)
- 形式・置き場は JSON 3面(`amadeus/config.json` / `spaces/<space>/config.json` / `<record>/config.json` — ADR-4 裁定 A)

### C4: phase 境界ミラー分岐

- 発火点: phase-check 対象3境界(ideation / inception / construction 完了時 — E-MPRRA1 裁定 A、`PHASE_CHECK_REQUIRED_PHASES` と同集合)
- auto-mirror off または未設定 → ask directive(「ミラー同期しますか?」、ミラー未作成時は create 選択肢込み)
- auto-mirror on かつミラー作成済み → sync 実行の print 指令(run-then-continue)
- auto-mirror on かつミラー未作成 → ask へ降格(E-MPRRA2 裁定 A)
- close 導線は本分岐に**含めない**(ADR-3 で明文化 — E-MPRRA1 [e4] 留保の履行)
- 既存 directive 語彙(ask/print)のみ使用(C-04)。stdout=directive JSON / stderr=advisory の契約維持(C-08)

### C5: ノルム改定(gh optional)

- gh-scripts-boundary cid の改定文言を norm PR で main へ(FR-7 受け入れ基準 (a)(b)(c) — Bolt 1 マージ前提の順序制約)

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T02:58:20Z
- **Iteration:** 2
- **Scope decision:** none

iteration1 Major2件(ADR 可逆性7件欠落/architecture.md 対立候補への ADR-1 無応答)+Minor2件を是正、iteration2 実質検分で READY

### Findings

- 全7 ADR へ Reversibility 追加(是正済み)
- ADR-1 へ contrib overlay/scripts 据え置きの却下理由+G-2 前提更新の明文照合(是正済み)
- ラベル統一・diary 記入(是正済み)
