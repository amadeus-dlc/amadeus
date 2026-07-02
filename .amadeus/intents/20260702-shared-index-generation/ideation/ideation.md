# Ideation

## 実現可能性

| 観点 | 状態 | メモ |
|---|---|---|
| 技術 | feasible | `intents.md` と `discoveries.md` は一覧表と依存関係表で構成され、行の情報源は配下モジュールに揃えられる。validator は既に Index ID 参照の検査カテゴリを持ち、インデックスと配下の対応検査の土台がある。生成入口は Issue #311 の `StateScaffold.ts` と同じ Bun と TypeScript の同梱スクリプト方式を使える。 |
| 運用 | feasible | 並行 branch の統合時に再生成すれば、共有インデックスの追記衝突を手動で解消する作業がなくなる。直近の並行作業（Issue #309 の Construction と本 Intent の Ideation）でも intents.md が唯一の共有接触面であり、解消効果を観測しやすい。 |
| セキュリティ | feasible | workspace 内の Markdown と JSON の読み書きだけで成立する。秘密情報や認証情報を扱わない。 |
| 依存 | feasible | 既存 Intent の完了を前提にしない。同梱スクリプトの配置と promote の方式は Issue #311 で確立済みのパターンを再利用できる。examples snapshot 内の `.amadeus/intents.md` への影響は Inception で確認する。 |

## 体制

| 役割 | 種別 | 関心 |
|---|---|---|
| Maintainer | 判断者 | インデックスに残す情報と配下モジュールへ移す情報の境界、生成入口の配置先を判断する。 |
| Agent | 実行者 | Intent または Discovery の作成時に、インデックスを手書きせず再生成で更新する。 |
| Reviewer | 参照者 | 生成されたインデックスの差分から、並行統合の結果を判断する。 |
| Validator | 構造検出者 | インデックスと配下モジュールの不整合を fail として検出する。 |
| Evaluator | 品質評価者 | 再生成の決定論性（同じ入力から同じ出力）を確認する候補になる。 |

## 初期モック

| モック | 目的 | ファイル |
|---|---|---|
| 初期確認 | 並行する 2 つの branch がそれぞれ Intent を追加し、統合後の再生成で `intents.md` が手動コンフリクト解消なしに一致する流れを示す。 | [initial-confirmation.puml](mocks/initial-confirmation.puml) |

## 未確定事項

- インデックスに残す情報（一覧の列）と配下モジュールへ移す情報の境界は Inception で判断する。
- `intents.md` の依存関係表の移行先（各 Intent のモジュールファイルへ移すか、インデックスに残すか）は Inception で判断する。
- 生成入口の配置先（skill 同梱スクリプトか、validator 付属か）は Inception で判断する。
- 手書き編集とのすみ分け（生成対象範囲の宣言方法、生成マーカーの要否）は Inception で判断する。
- examples snapshot 内のインデックスへの影響と再生成の要否は Inception で判断する。

## 学習候補

- 共有ファイルへの追記衝突は、そのファイルを配下モジュールからの生成物にすることで構造的に消せる。glossary や domain-map など他の共有成果物にも再利用できる可能性がある。
- 並行作業の衝突リスクは、成果物のファイル単位の接触面を列挙することで事前に判断できる。
