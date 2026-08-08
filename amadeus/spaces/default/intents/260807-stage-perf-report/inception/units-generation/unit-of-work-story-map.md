# Unit of Work Story Map — 260807-stage-perf-report

上流入力(consumes 全数): requirements(FR-1〜FR-7 を価値スライスの正本として消費 — user-stories ステージは本スコープで SKIP のため stories.md は不在)、components(FR→コンポーネント対応を実装単位の根拠として消費)、component-methods(各スライスの検証面 = AC 対応シグネチャを消費)、services(単一サービスへの全スライス集約を消費)、component-dependency(スライス間の内部依存を実装順の参照として消費)、decisions(ADR-4 `--json` 追加 = FR-6 スライスの拡張裁定として消費)

## 前提: stories.md の不在(設計上の欠落)

user-stories ステージ(2.4)は self-feature スコープで SKIP のため stories.md は生成されていない。存在しないストーリーを捏造せず(cid:approval-handoff:c4 同型)、**requirements.md の FR 群を価値スライスの正本**として Unit へ写像する。

## FR → Unit 写像(全数)

| 価値スライス | Unit | 実装コンポーネント(components.md) |
|---|---|---|
| FR-1 コーパス走査と帰属(2 世代正規化・fail-loud) | U1 stage-stats-cli | C1 CorpusScanner |
| FR-2 実作業時間(窓構成・idle 減算・除外バケット) | U1 stage-stats-cli | C2 WindowBuilder / C3 IdleSubtractor |
| FR-3 §12a レビューイテレーション集計 | U1 stage-stats-cli | C4 ReviewBlockCollector |
| FR-4 センサー FAILED 率 | U1 stage-stats-cli | C5 SensorTallier |
| FR-5 モデル帰属(UNKNOWN fail-closed) | U1 stage-stats-cli | C6 ModelAttributor |
| FR-6 出力(Markdown/CSV/--json・統計・決定的順序) | U1 stage-stats-cli | C7 StatsComposer / C8 Renderer |
| FR-7 決定性と read-only(exit ladder) | U1 stage-stats-cli | C9 CliShell(+全体不変条件) |

## 横断スライス

- NFR-1〜NFR-5(性能・テスト配置・被覆・配布・落ちる実証)は U1 全体に係る横断要件であり、単一 Unit のため Unit 間分担は発生しない

## Unit 内実装順(トポロジー由来の参照情報)

C1(入力)→ C2/C3(窓・減算)→ C5/C6(集計)/ C4(record 走査は独立)→ C7(統計)→ C8(出力)→ C9(shell)の下流一方向。経済的な出荷順序(Bolt 編成)は 2.8 Delivery Planning が決定する。

## 被覆検証

- 全 FR(FR-1〜FR-7)が U1 へ割当済み(未割当スライス 0)
- U1 は 7 スライス全てを持つ(スライスを持たない Unit 0)
