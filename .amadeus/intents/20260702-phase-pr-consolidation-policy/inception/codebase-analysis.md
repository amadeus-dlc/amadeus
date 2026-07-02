# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `.amadeus/steering/policies/git-branching.md` | steering policy | Branch Lifecycle（起点、基準 branch、branch 名、追従、PR 作成前検証、PR 作成、PR 監視、merge、merge 後処理）、例外、policy 参照、検出境界の構成を確認した。branch 名の例は `codex/issue-254-ideation` のように phase 単位である。 |
| `.amadeus/steering/policies.md` | steering policy | 変更種別「skill 変更」の粒度制約（skill 変更 PR は skill 変更だけで構成、例外は不可分な場合のみ、例外記録の型は Git Branching Policy に合わせる）を確認した。 |
| `.amadeus/development.md` | 運用手順 | PR 準備条件（対象 phase の成果物が validator で pass、追跡項目の記録）と phase ごとの進め方の表を確認した。PR の単位を phase ごとに固定する明示の記述はなく、統合の許可条件が未定義である。 |
| 直近の cycle 記録 | 実データ | 2 Intent（20260702-phase-gate-approval-contract、20260702-state-json-scaffolding）の完走に phase PR 13 本と人間 merge 13 回を要した。gate の判定はすべて `state.json` で行われ、PR の単位に依存していないことを確認した。 |

## 既存能力

- Git Branching Policy は Branch Lifecycle の節構造を持ち、統合条件を「PR 作成」節の拡張または新しい小節として追加できる。
- 例外記録の型（理由と後続確認先を PR 説明に記録）が既に定義されており、統合 PR の記録項目を同じ型で書ける。
- `ideation/scope.md` の実行制御には「実行スコープ」の語彙が既にあり、統合条件の第 1 条件（refactor または docs 系）をそのまま参照できる。
- gate の判定は phase ごとに `state.json` で行われており、PR の単位と独立している。雛形生成（StateScaffold）により複数 phase 分の state 更新も構造 fail なく行える。

## 統合点

- `git-branching.md` の「PR 作成」節の直後に、統合条件の小節を追加できる。
- 「branch 名」節に、仕様側統合 branch の命名（`codex/issue-<n>--specification` 相当）の例を追加できる。
- `development.md` の PR 準備条件は「対象 phase の成果物が validator で pass」と書かれており、統合 PR では「含まれる各 phase の成果物」と読み替える整合確認が必要である。

## ギャップ

- phase PR を統合してよい条件が未定義で、既定（phase ごとの PR）も明文化されていない。
- 統合 PR の説明に含めるべき記録項目（どの phase 成果物を含むか、各 phase の gate 状態）が未定義である。
- branch 命名の例が phase 単位のみで、統合 branch の命名例がない。

## リスク

- 統合条件が緩いと、未確定事項を残したまま仕様 3 phase を 1 PR にまとめ、grilling なしの大きな差し戻しが発生する。GD002（3 条件すべて必須）で緩和する。
- 粒度制約（skill 変更 PR は skill 変更だけで構成）と統合許可が矛盾して読まれる可能性がある。統合対象は仕様成果物（`.amadeus/**`）のみであり skill 変更を含まないことを明記する必要がある。
- development.md の「対象 phase の成果物が validator で pass」の単数形の読みと、統合 PR の複数 phase が食い違う可能性がある。

## Inception への入力

- 要求は、統合条件と既定の定義、統合 PR の記録項目、branch 命名の整合、既存文書（development.md、粒度制約）との整合確認に分ける。
- Unit は、BC001 を参照する単一の価値境界（phase PR 統合の policy 契約）で扱える見込みである。
- Bolt は、git-branching.md への統合条件の追記（B001）、development.md の整合確認と必要な補正（B002）に分けられる。B002 は B001 の条件文言を参照するため B001 に依存する。
- Construction では docs-only の文書変更であり、skill 変更を含まないためレビュー支援契約の skill-forge 確認は対象外になる見込みである（変更種別は policy 変更）。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `.amadeus/steering/policies/git-branching.md` | Branch Lifecycle の節構成と branch 命名例の確認。 |
| file | `.amadeus/steering/policies.md` | 粒度制約と例外記録の型の確認。 |
| file | `.amadeus/development.md` | PR 準備条件の現状確認。 |
| file | `.amadeus/intents/20260702-phase-gate-approval-contract/state.json` | gate 判定が PR 単位と独立して state で行われることの確認。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | `b84694d3acb4f918471711ce43168b871cf08d64` |
| analyzedAt | `2026-07-02T06:37:48Z` |
| freshness | current |

## 未確認事項

- 統合条件の最終文言と節の配置は、Unit Design Brief と Construction で確定する。
