# Business Logic Model — U1 fmc-retirement(退役の実行モデル)

上流入力: `inception/units-generation/unit-of-work.md`(U1 write scope 2 面)・`unit-of-work-story-map.md`、`inception/application-design/components.md`(変更マップ)・`component-methods.md`・`services.md`(配送許容線)・`component-dependency.md`(直列 8 段)、`inception/requirements-analysis/requirements.md`(FR 受け入れ基準)。census 一次記録 = `codekb/amadeus/re-scans/260821-fmc-retirement.md`。

## 実行モデル(直列 8 段の実装展開)

| 段 | 操作 | 完了述語 |
|---|---|---|
| 1 | 合成 fixture プラグイン新設(`tests/fixtures/conformance-fixture-plugin/` — plugin.json + stage + sensor + tool + advisories) | fixture 単体で graph compile / conformance 検査対象の形状充足 |
| 2 | テスト差し替え: B1 16(fixture 束縛)+ A2 温存 4(fixture 再配線 + `tests/harness/formal-model-fixture.ts` は `tests/harness/conformance-fixture.ts` へ改名改修(BR-7 語彙))+ B2 44(参照除去)+ t2415×2 と RE 本文・amadeus-lib コメントの同時更新 | `bun test <差し替え群>` exit 0(この時点では FMC 併存のため両立確認) |
| 3 | O-5 代替テスト 2 本(`function:PluginStageError` / `amadeus-log advisory-decision`) | Red→Green(§TDD 適用判定は business-rules BR-4) |
| 4 | 本体削除: plugin 43 + specs 21 + A1 92 + A2 再分類 4 + docs 全面 4 = **164 ファイル** | `git status` に削除が全数出現、targeted 群 green 維持 |
| 5 | 設定・CI: config.json 2 項 / ci.yml job(:765-870)+needs(:905)+require_result(:989) / detect-ci-changes 2 パターン / mise.toml JDK | yaml parse 正常・FR-CI-1〜3 述語 |
| 6 | 再生成: `bun run build` → registry regen → patch-allowlist 6 エントリ除去 → complexity-baseline 2・silent-success 6・test-time-factor 3 エントリ除去 → `formal-verif-ci-baseline.sha256` を消費者(A1)ごと削除 → runner-gen check | 台帳 6 面の該当エントリ 0(下記「台帳 reconciliation」) |
| 7 | docs: 部分除去 16 + 索引 4 + 休眠明記 1 文(中立表現) | t3028 整合・FR-DEL-1 述語 |
| 8 | 検証: typecheck / lint / targeted(t341・B1・A2 温存・O-5)→ push → PR → リモート CI 正本 | NFR-1 |

## 台帳 reconciliation(§12a FOLLOW-UP への設計時回答 — **仮説。code-generation 着手時に実測で確定**)

RE census §4.1 の実測により「166 = テスト・fixture 161 + 台帳 5」の 5 件を実名確定する: `tests/.coverage-registry.json`(regen)/ `.coverage-patch-allowlist.json`(6 エントリ除去+再アンカー)/ `.complexity-baseline.json`(2 エントリ)/ `.silent-success-baseline.json`(6 エントリ)/ `.test-time-factor-allowlist.json`(3 エントリ)。加えて fixture `formal-verif-ci-baseline.sha256` は 161 側(fixture)に含まれ消費者ごと削除。**B2 の 44/45**: B2 総数 45 のうち編集不要 1(`t-formal-model-plugin-boundary` — plugins/ 動的列挙)を除く 44 が編集対象 — 数値ドリフトではなく母集団の書き分け(45 = 分類、44 = 編集対象)。

## 落ちる実証(FR-DEL-1 述語の健全性)

受け入れ grep(`formal-model-check|tla-authoring|specs/tla`)は削除**前**の断面で非ゼロ(現状赤)であることを実測してから削除を実施し、削除後 0 hit(緑)へ — 述語レベルの現状赤→緑で「常に緑の述語」を排除する。対照リテラル `pr-convergence`(削除後も非ゼロ)を同一実行で併記。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-21T04:40:25Z
- **Iteration:** 2
- **Scope decision:** none

NOT-READY: business-rules.md の H2 見出し 0 個(required-sections 契約違反)。他は FOLLOW-UP 3 + NIT 2

### Findings

- BLOCKER | business-rules.md に H2 見出しが 0 個 — required-sections の ≥2 H2 契約違反(BR 群を意味のある H2 グループへ分割)
- FOLLOW-UP | business-logic-model.md の上流入力行に components/services/story-map の言及欠落(consumes 6 件網羅は他 3 文書のみ)
- FOLLOW-UP | BR-4 の t2415 逆順 TDD 前提は assertion 形態(合意述語型 vs literal-pin 型)未確認 — code-generation 着手時に実体確認し literal-pin なら標準 test-first へ
- FOLLOW-UP | produces_kinds が kind=packaging を含まない既存ギャップ(ステージ契約と unit kind の間)— 申し送り
- NIT | O-5 表の TDD 注記の対称性
- NIT | frontend-components の N/A 生成 vs skip guidance の整合検討
