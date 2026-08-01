# Performance Design — u1-schema-resolver

**Intent**: 260801-tla-multi-model / **Stage**: nfr-design / **Unit**: u1-schema-resolver(C1+C2)

上流入力(consumes 全数): performance-requirements(計算量・実行時間・決定性・資源の境界), security-requirements(fail-closed 方針の性能側含意なし), scalability-requirements(線形性の唯一要件), reliability-requirements(出力決定性), tech-stack-decisions(新規依存なし・純粋モジュール), business-logic-model(§1.2 exactObject 4形分岐 / §2.1 行ベース抽出 / §2.3 visited ワークリスト BFS / §2.6 宣言照合)

## 1. 設計方針

新規の性能機構(キャッシュ・ワーカー・非同期化)は**一切追加しない**。performance-requirements が定める境界は、functional-design が既に固定した機構(visited 集合による単読・行ベース抽出・4形分岐)で全て満たされる。本書はその写像と検証方法を固定し、code-generation が推測で予防的最適化を足すことを禁止する(ADR-8 measure-first、超過判定は u5 帰属)。

## 2. NFR → 機構マッピング(検証方法付き)

| 要件(正本) | 設計機構(functional-design の既指定) | 検証方法(どのテスト/AC が証明するか) |
|---|---|---|
| 推移閉包 O(n+m)、各モジュール高々1回読取 | C2 §2.3: `visited` 集合付きワークリスト BFS。訪問済み管理は循環検出(`MODULE_DEP_CYCLE`)と同一機構で、再走査の経路が構造的に存在しない | t402 推移閉包ケース(A→B→C): 注入 `readModule` stub の呼出回数がモジュール数を超えないこと(scalability-requirements Acceptance と同一判定) |
| 抽出 O(行数) | C2 §2.1: ブロックコメント単純走査 → 行コメント除去 → 行頭キーワード走査の一方向パス。ソースの再パース・全ペア比較なし | t402 偽陽性/偽陰性ガードケースが走査規則どおりの結果を返すこと(規則の一回走査性の間接実証) |
| スキーマパース追加コスト O(1) | C1 §1.2: 許可キー集合4形(最大6キー)の `some` 判定。`exactObject` 本体は不変 | 既存スキーマ表テスト拡張(dual-copy `describe.each`)が green であること。省略モデルは従来形分岐で性能特性不変(BR-S1) |
| 省略モデル byte 不変(NFR-1 の性能側) | C1 §1.5: 分岐1(従来形)は同一コード経路・同一戻り値 | 既存テスト据置き(electionModel / mirrorModel ケースの期待値不変)— performance-requirements Acceptance (2) |
| 出力決定性(BR-R5) | C2 §2.3-4: ソート済み・重複排除・起点除外の配列。走査順・集合実装に依存しない | t402: 同一入力で同一出力、推移閉包結果が `["B","C"]` の正規化形であること — Acceptance (3) |
| メモリ境界(全ソースを同時保持しない) | C2 §2.3 + BR-R8: `readModule` 注入経由で1モジュールずつ取得。retained data は visited 名集合・ワークリスト・抽出参照名のみ | コード検査: モジュール本体にソース蓄積用のモジュールスコープ状態を持たないこと(純粋関数設計の lint/レビューで担保) |
| 依存解決コスト増分ゼロ(NFR-4) | tech-stack-decisions: `tla-module-deps.ts` は `node:` import さえ持たない純粋モジュール | import 一覧検査(型 import のみ)— performance-requirements Acceptance (4) |
| 宣言照合 O(n log n) 上限 | C2 §2.6: declared/resolved とも小集合のソート + 集合差分。全ペア比較禁止 | t402 宣言照合ケース(DriftReport の missing/extra 双方向) |
| 測定目標(全登録モデル一巡 < 1 秒) | 機構追加ではなく測定プロトコル: 現行規模(4モジュール)で loader 検証内 1 秒未満。CI 30 分 timeout との整合は u5(FR-5、ADR-8 measure-first)が実測で判定 | u5 の実測(本 Unit では推測による予防的最適化を行わない — performance-requirements §計算量と実行時間の境界) |

## 3. 禁止事項(code-generation への制約)

- キャッシュ・メモ化・ワーカー・並列化の追加禁止(現行規模で不要、scalability-requirements の過剰設計禁止)。
- O(n+m) を超えるアルゴリズム(全ペア比較、ソースの再走査、再帰的な全文読み直し)の禁止。
- 性能目的の新規外部依存の導入禁止(NFR-4 — `bun.lock` / `package.json` 差分ゼロが Acceptance)。

## 4. N/A カテゴリの扱い(別書3点の位置づけ)

本 Unit は library kind のため、stage frontmatter の `produces_kinds`(scalability-design / reliability-design / logical-components: [service])上では以下3書は名目上 kind 対象外である。ただし engine の produces 要件が Unit あたり全5書を必須とするため、3書は**生成済み**であり、適用外カテゴリの根拠と適用のある写像をそちらに収めている。kind ゲートを越えた生成は engine produces 要件を優先した意図的な逸脱として本節に記録する。

- **scalability-design.md**: 適用外評価の転記 + 「成長しても線形のまま」一点の写像(visited ワークリスト BFS、t402 stub 呼出回数の判定は §2 の表と同一)。scalability-requirements.md §適用性の評価 / §成長に対する境界を前方参照。
- **reliability-design.md**: 可用性・バックアップ・災害復旧・データ耐久性の適用外評価の転記 + fail-closed・後方互換・決定性・複製整合の4系統の写像(fail-closed は security-design.md §2 の表、byte 不変・dual-copy 同時更新・patch coverage 100% ゲートは同 §3 と同一機構)。reliability-requirements.md §fail-closed / §後方互換を前方参照。
- **logical-components.md**: 常駐サービス境界・障害ドメインを持たない単一プロセス内純粋モジュールのため論理インフラ要素は非存在とし、Unit 内の論理コンポーネント境界(C1/C2/shim)と共有資源を列挙。ブラスト半径は「byte-identical 2 複製の片側のみ更新」一点に集約され、§1.6 の更新手順 + dual-copy テストで構造的に赤化する設計が security-design.md §3 に記載済み。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-01T22:06:14Z
- **Iteration:** 2
- **Scope decision:** none

iteration-1 Major (§4 not-generated contradiction) fixed: §4 rewritten to state files generated per engine produces requirement with deviation recorded; iteration 2 READY, no findings.

### Findings

- None
