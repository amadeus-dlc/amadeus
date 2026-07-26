# Code Summary — U1 harness-capability-matrix（Bolt 1）

> 上流入力(consumes 全数): functional-design/domain-entities、functional-design/business-logic-model、functional-design/business-rules、application-design/decisions、application-design/components、application-design/component-methods、application-design/services、units-generation/unit-of-work-story-map、requirements、nfr-design/performance-design、nfr-design/security-design、nfr-design/scalability-design、nfr-design/reliability-design
> 本 Unit はコード非搬送(record 文書 PR)。成果 = 7 ハーネス × 6 面の実測マトリクスとクラス割当。ProbeRecord のフィールド様式(command verbatim / preprocessing / verdict)は security-design「ProbeRecord 様式」の fail-closed 決定に従い、時間フィールドは performance-design のとおり意図的に不設置。probe-id は reliability-design「参照 ID 規約」の `P-<harness>-<面>` 形式、42 count 照合は scalability-design「列の固定列挙」の §12a 機械確認。

## 測定 ref

- HEAD SHA(`git rev-parse HEAD`): `7833768fb6bca7de750d39bb800dccc0e0cc46d0`

## 何を実測したか

6 面 × 7 ハーネスを一次資料(リポジトリ実装)の read-only 実測で確定した。主な実測ソース:

- **distribution**: `scripts/plugin-projection.ts:46-60`(`PACKAGE_HARNESSES` 7 値 / `SELF_INSTALL_HARNESSES` 5 値)、各 `manifest.ts` の `harnessDir`、`projections.ts:105,111`(kiro/kiro-ide `selfRoot:null`)、`dist/` 実在。
- **composeTrigger**(最重要): 各面のホスト event 語彙を file:line で確定 — claude `SessionStart`(settings:34)、codex `SessionStart`(emit:31)、cursor `sessionStart`(emit:63)、kimi `SessionStart`(snippet:20)、kiro `agentSpawn`→session-start(agents:54-56)、kiro-ide `promptSubmit`(.kiro.hook)、opencode `chat.message` のみ(plugin:36)。
- **rootResolution**: 各 hook の projectDir 解決 env/ladder(`core/tools/amadeus-lib.ts:297` の共通 ladder ほか)。
- **trust / userOps / degradeContract**: ADR-4 の統一 grant 契約と C1 verb 表への写像。

## 何を deferred にしたか（3 面 — 存在しない機構の仮定禁止 BR-U1-2/6）

1. **claude / distribution(marketplace)**: Claude Code plugin marketplace の `/plugin` 導入 UI はローカル起動不能 → 実装時に host CLI で live 実測。
2. **kiro-ide / composeTrigger**: 真の session-start でなく promptSubmit 発火 → 初回 promptSubmit での `compose --if-stale` 冪等許容を Bolt 6 で確認。
3. **opencode / composeTrigger**: session lifecycle イベントが未配線(chat.message のみ)→ plugin API の session event 実測、なければ chat.message 冪等トリガ採用可否を Bolt 6 で判定。

本セッションはホスト CLI 未導入のため全プローブが read-only リポジトリ実測(mutation なし)。ライブ起動が必要な native 導入面のみ deferred とした。

## クラス割当の集計（列挙からの機械再計算）

| クラス | 件数 | ハーネス |
|---|---|---|
| `native-manifest` | 1 | claude |
| `folder-drop-auto` | 5 | codex, cursor, kimi, kiro, kiro-ide |
| `manual-only` | 1 | opencode |
| **合計** | **7** | 欠落・未定なし(BR-U1-1) |

## 全数性チェック（BR-U1-1）

- 行数 = 7(全ハーネス)。6 コンテンツ列(distribution / trust / composeTrigger / rootResolution / userOps / degradeContract)全数を各行で充足。空欄・行省略なし。
- 各セルは実測(file:line + ProbeRecord 参照)か `⚠ deferred` +確定条件 1 行のいずれか(BR-U1-2)。
- **per-cell probe-id count 照合(reliability-design / scalability-design の §12a 機械確認)**: `grep -oE 'P-(claude|codex|cursor|kimi|kiro|kiro-ide|opencode)-(distribution|trust|composeTrigger|rootResolution|userOps|degradeContract)' harness-capability-matrix.md | sort -u | wc -l` → 出力 **42**(コマンド出力転記 — numbers-from-command-only)。7×6=42 セル全数が distinct ID を持ち、ProbeRecord (d-2) 索引表 42 行と 1:1。
- 結論部に Bolt 3(投影対象面 = 7 host projection + 1 neutral)/ Bolt 6(フック配線面 = wired 6 + deferred 1 + 全 harness 手動床)の機械可読 YAML を配置(BR-U1-7)。

## 逸脱・所見

- **opencode の fail-closed manual-only 割当**: 設計・feasibility(feasibility-assessment.md:28,34)は cursor/opencode/kimi を「folder-drop+hook または manual」と見込んでいたが、opencode は session-start seam が未配線(chat.message のみ measured)のため、決定的判定ロジックの枝(ii)が不成立 → BR-U1-6 の fail-closed で `manual-only` に確定した。これは設計契約(fail-closed 規則)に沿った判定であり契約逸脱ではない。chat.message を per-message 冪等トリガとする upgrade 余地は Bolt 6 の deferred として明記済み。
- **設計との不整合なし**: ADR-4 の 3 クラス literal、C1 verb 表、C3/C4 の投影・フック面、domain-entities の 7 行×6 列契約すべてと整合。
- **§12a iteration 1 是正(probe-id の per-cell 化)**: 初版は probe-id を列共有の P1〜P6(6 個)へ縮退させており、reliability-design の 42 セル distinct trace 契約からの無申告縮退として Major 指摘を受けた(根本原因 = nfr-design 4 点のヘッダ未記載)。是正で全セルを `P-<harness>-<面>` の 42 ID 化し、ProbeRecord に (d-2) 索引表(42 行)を新設、3 ファイルのヘッダへ nfr-design 4 点を追記した。
