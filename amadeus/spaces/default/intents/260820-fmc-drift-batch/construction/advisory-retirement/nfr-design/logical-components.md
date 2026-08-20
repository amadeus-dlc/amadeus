# Logical Components — advisory-retirement(U3 / #3187)

上流入力: `construction/advisory-retirement/functional-design/business-logic-model.md`(撤去手順)/ `security-design.md`(本ステージ同梱)。NFR Requirements 群(`performance-requirements` / `security-requirements` / `scalability-requirements` / `reliability-requirements` / `tech-stack-decisions`)は不在かつ設計どおり(security-design.md 冒頭の宣言と同じ)。本書は撤去の**論理コンポーネント台帳** — どの境界が消え、どの境界が不変で、blast radius がどこで止まるかを Infrastructure Design 相当の視点で固定する(本 intent はデプロイ基盤を持たないため、境界は plugin/engine/テスト面のコード境界で表す)。

## コンポーネント境界と blast radius

| 論理コンポーネント | 本 unit での扱い | blast radius / 隔離根拠 |
|---|---|---|
| authoring-hold advisory 宣言面(`plugin.json` advisories[]) | エントリ削除 | engine は宣言駆動で評価対象を列挙するため、削除は engine 側 diff 0 行で完結(business-rules.md BR-2)。`spec-change` advisory は同配列内の別エントリとして残存(BR-3) |
| advisory 経路コード + subjects 書き手(`tla-authoring.ts`) | 該当関数・型・dispatch・USAGE の削除 | 呼出面は CLI dispatch のみ — 削除後は未知 verb 拒否に合流し、他 verb(applicability / registration 群)への波及なし |
| stage 契約 + docs(`stages/tla-authoring.md:53`、`docs/reference/22-formal-model-supply.{md,ja.md}`) | 該当手順・節の削除(en/ja 同一変更) | 消費者は stage 実行時の読み手のみ。U4 が同ファイル `:51` 近傍へ追記するため **U3 → U4 直列**(unit-of-work.md の宣言済み依存辺)で衝突を構造的に回避 |
| engine 汎用 advisory 機構(`amadeus-orchestrate.ts` の同名 `advisoryHold`) | **非接触**(failure domain の外) | 同名別物 — FR-RET-3 の名指し境界。census 除外の帰属条件で機械的に区別 |
| tla-authoring の実効起動経路(scope-binding stage grid) | **非接触** | business-rules.md BR-4 — 発火経路は grid 一本のまま、U3 の diff は判定ロジックに触れない(それは U4 の面) |
| テスト面(t528/t524 削除、t450 pin 追随、期待値7本、t481/t527 部分更新) | FD 確定の処分区分どおり | 削除・更新対象は退役機構を pin するテストのみ — 存続テストの対象機構(spec-change・receipt・resolver)は不変 |
| 共有リソース: `plugin.json`(U1 と共有) | U3 は advisories[] のみ接触 | U1 の接触面は tools[] 1行 — 行非交差(U1 FD の条件付き write scope 宣言と整合)。直列 PR 着地の textual merge で解決 |
| 生成台帳(`tests/.coverage-registry.json`) | テスト削除後 regen 同梱 | 全 unit が regen で書く既知の共有面 — registry-merge-recomposition の既定運用対象 |

## 障害ドメインと封じ込め検査

- **封じ込めの機械検査**: FR-RET-4 census(9キー・対象集合・帰属除外・対照リテラル)が「削除漏れ = 境界外への残存」を fail-closed に検出する(business-logic-model.md の確定形を唯一の正本として参照 — 本書で再定義しない)。`bun run build` 後の投影面(`.claude/` / dist)への同 census 再適用が配送先ツリーの封じ込め確認を担う。
- **単一 PR 原子性**: 宣言面・コード面・stage 契約・docs・テスト・台帳を1 PR で着地させ、中間状態(宣言だけ消えて実装が残る等)を main に置かない(domain-entities.md ライフサイクル)。

## NFR パターン適用点(Infrastructure Design への橋渡し)

本 intent はデプロイ基盤・常駐サービスを持たず(services.md「新設サービスなし」)、infrastructure-design ステージはスコープ外。本書の境界台帳が NFR 設計と実装(code-generation)の間の唯一の橋であり、追加のインフラコンポーネントは存在しない。
