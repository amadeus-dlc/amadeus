# Business Rules — `stop-question-carveout`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `requirements.md` 領域 C(FR-STOP-1/2 — trace 先)、`components.md` ADR-7、`component-methods.md` §C11(逐語)、`services.md` P4(non-blocking hook)、`unit-of-work.md` §`stop-question-carveout` 実装上の制約、`unit-of-work-story-map.md` §ゴールでないもの(走行単位の限定)。

---

## 決定規則と不変条件

| # | 規則 | 出所 |
| --- | --- | --- |
| R1 | **開くのは `:422` のみ**: semi へ carve-out を開く呼び出し点は tier-2 質問 carve-out に限る。`:457`(compose)/ `:716`(conversational)は full 限定を維持する | FR-STOP-1 の表 |
| R2 | **provenance 要求**: semi の carve-out は `modeProvenance.kind === "human-command"` を要求(state 文字列だけで判定しない — projection との二重判定は現行 full 側と同形) | §C11 の契約表 |
| R3 | **例外は保守側**: `catch → false`(carve-out を与えない)。この文脈の false は保守側であり fail-closed と整合 | §C11 / D3 |
| R4 | **cap / budget 不変**: `AUTONOMOUS_BLOCK_CAP`(`:153`)と `stopBudgetMode`(`:157-160`)は diff に現れない | FR-STOP-2 |
| R5 | **走行単位の主張限定**: 本 Unit の効果は「質問で stop hook が走行を切らない」まで。「phase 完走」と書かない | FR-LAD-6 / story-map §ゴールでないもの |
| R6 | **既存名の保存**: `isFullyAutonomousIntent` は意味論不変のため改名しない。同期対象への改名同期は発生させず、U-6 の行 remap のみ残す。同期対象の実測(worktree HEAD `5f6561eef6098209c4c29461ae0d7c6d070b5c01`): `tests/.coverage-patch-allowlist.json:5268`(verbatim `      "function": "isFullyAutonomousIntent",` — 属する allowlist エントリは `:5265-5275`)/ `tests/unit/t147-kiro-hook-adapter.test.ts:723`(コメント verbatim `    // long ceiling AUTONOMOUS_BLOCK_CAP=8. Same brownfield-feature engine state`) | D2(U-5 の解消) |
| R7 | **ピンの同時反転**: t121:1138-1150 の旧仕様ピンは C11 変更と同一 PR で反転する(分離すると CI が赤のままマージ不能) | FR-PIN-2 / `unit-of-work.md` §テスト・ピンの所属 |

## バリデーション論理

- 判定は state(第 1)→ projection(第 2)の 2 段。第 1 段で mode が判定対象外なら projection を読まない(不要な I/O を起こさない — 現行 `:171` の様式)。
- 新述語は真偽値のみ返し、理由を持たない(呼び出し側 tier が文脈を持つ — 現行様式)。

## テスト固定(受け入れ基準 → ケース対応)

| ケース群 | 対象 | 期待 |
| --- | --- | --- |
| S1(t445, unit) | 新述語判定表 6 行 | business-logic-model.md §検証 の 6 ケース |
| S2(t121 拡張, integration) | semi + 質問 pending + `:422` | stop しない(carve-out — FR-STOP-1 (1)) |
| S3(integration) | semi + `:457` / `:716` | stop する(carve-out なし — FR-STOP-1 (2)) |
| S4(落ちる実証) | 述語の無条件共有化 | S3 が赤(注入 → 赤 → 復元 → 残渣ゼロ) |
| S5(FR-PIN-2) | t121:1138-1150 反転 | 新意味論(BLOCK)で green、旧ピンは同一 PR で消滅 |
| S6(FR-STOP-2) | cap / budget | 両行が diff 不在+既存テスト無改変 green |

## 本 Unit が守らない(守る必要がない)規則の明示

- 質問の裁定そのもの(梯子)は `semi-authorization-core` の所有 — 本 Unit は「止めない」だけで「答える」は持たない。
- `Intent Autonomy Mode` の書き手(birth / set-autonomy / `--autonomy`)には触れない。
