# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | `state.json` の要求構造は validator の契約（`generated/task-generation-contract.ts` などの生成済み契約と検査実装）として決定論的に定義されており、遷移ごとの雛形は既存実データ 17 Intent 分を先例として生成できる。Bun と TypeScript の同梱スクリプトは Issue #309 の検出スクリプトと同じ配置方式を使える。 |
| 運用 | feasible | phase skill の手順からスクリプトを参照する形にすれば、エージェントが先例を読み手書きで再現する現状を置き換えられる。直近 cycle でも中間状態の必須配列の不足で validator 指摘と補修往復が発生しており、解消効果を観測しやすい。 |
| セキュリティ | feasible | スクリプトは workspace 内の `state.json` の読み書きだけで成立する。秘密情報や認証情報を扱わない。 |
| 依存 | feasible | 雛形に含める Task Generation Gate の evidence 形式は、Intent 20260702-phase-gate-approval-contract で確定済みである。skill 変更 PR はレビュー支援契約に従い、昇格は promote 手順を使える。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | スクリプトの配置先、更新規則の強度、Task Generation Gate の承認を行う。 |
| Agent | 実行者 | phase 遷移時に手書きの代わりにスクリプトで雛形を生成、更新する。 |
| Reviewer | 参照者 | skill 変更 PR の挙動差分要約と skill-forge 確認の記録から、手順変更の影響を判断する。 |
| Validator | 構造検出者 | 各遷移直後の `state.json` が構造条件を満たすことを検出する。 |
| Evaluator | 品質評価者 | スクリプトの出力と validator の要求構造の整合を確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | phase 遷移時にスクリプトで雛形を生成、更新し、直後の validator が構造 fail を出さない流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- スクリプトの配置先 skill（各 phase skill に分けるか、共有の 1 箇所に置くか）は Inception で判断する。
- 対象遷移ごとの入出力契約（引数、既存 state の読み方、更新の冪等性）は Inception で判断する。
- 既存 state を上書きしない更新規則（既存値の保持、必須配列の追記）は Inception で判断する。
- eval の置き場所と実行方法は Inception で判断する。
- validator の生成済み契約（`generated/**`）をスクリプトから再利用できるかは Inception で判断する。

## 学習候補

- validator が要求する構造は契約として決定論的なのだから、エージェントに手書きさせるのではなく生成手段を同梱するほうが、速く、揺れない。
- 中間状態（phase 開始直後）の必須フィールドは手書きで漏れやすく、遷移単位の雛形生成が特に効く。
- 同梱スクリプトの配置と promote の方式は、Issue #309 の検出スクリプトと共通のパターンとして再利用できる。
