# Amadeus DLC の並行実行 Discovery Brief

## 入力テーマ

- 開発スループットを上げるために、Amadeus DLC を複数 Intent で並行に回せるようにする方法の整理。2026-07-02 の自己開発会話での分析を入力にする。

## 確認した前提

- 入力元は会話である（2026-07-02 の並行実行に関する分析会話）。
- 対象分類は Amadeus DLC 契約と Amadeus 実装の両方である。
- AI エージェントの作業自体は並列化できるため、直列化要因は人間ゲート、共有インデックス成果物、コードの衝突面の 3 つである。
- 並行実行の対象範囲は「1 人の人間 + 複数エージェント（複数 worktree）」に限定する。複数人チームでの並行と複数 workspace での組織利用は除外し、後続テーマにする。（[G001](20260702-parallel-execution/grillings/G001-parallel-execution-scope-and-split.md) GD001）
- Intent 候補は 4 件に分け、multi_intent として整理する。（GD002）
- 最初に Intent 化する recommended 候補は「共有インデックスの生成物化」である。（GD003）
- 既存 Discovery に同じテーマはない。

## 判定

multi_intent

## 判定理由

- 変更対象領域が lifecycle 契約、skill、validator、steering policy にまたがり、単一 Intent として扱うには大きい。
- 4 候補は主対象領域が異なり（生成物化は契約と validator、ゲート待ち可視化は skill、Bolt 並行は Construction 契約、並行運用は steering policy）、独立に検証できる。
- 並行運用の実経験がない段階で Bolt 並行と運用ポリシーを確定すると推測設計になるため、共有インデックスの衝突除去を先行させ、水平並行の運用経験を後続候補の設計根拠にする。

## Intent Draft

該当なし

## Intent 候補

| 候補 | 状態 | Intent | 課題 | 成功状態 | 除外範囲 | 依存 |
|---|---|---|---|---|---|---|
| 共有インデックスの生成物化 | intent_record_created | [20260702-shared-index-generation](../intents/20260702-shared-index-generation.md) | すべての Intent が `intents.md` を、すべての Discovery が `discoveries.md` を更新するため、並行 branch 間で共有インデックスの追記衝突が起き、水平並行の構造的な障害になっている。 | `intents.md` と `discoveries.md` が配下モジュールから決定論的に再生成でき、並行 branch の統合で共有インデックスの手動コンフリクト解消が不要になり、インデックスと配下モジュールの不整合を validator が fail にする。 | `glossary.md`、`domain-map.md`、`context-map.md` の生成物化と、repo 開発用 `CONTEXT.md` は含めない。 | なし |
| ゲート待ちキューの可視化 | intent_record_created | [20260702-gate-queue-visualization](../intents/20260702-gate-queue-visualization.md) | 並行 Intent が増えると、どの Intent がどの phase のどのゲートで承認待ちかを人間が一望できず、承認の見落としと詰まりが起きる。 | 複数 Intent の `state.json` を横断スキャンし、承認待ちの Intent、phase、ゲート、待ち理由を一覧できる。 | 承認そのものの自動化と通知基盤は含めない。 | 並行 Intent が走り始めてから効果が出るため、共有インデックスの生成物化の後に扱う。 |
| 並行運用ポリシー | intent_record_created | [20260702-parallel-operation-policy](../intents/20260702-parallel-operation-policy.md) | worktree 並行、フェーズパイプライン、ゲート承認のバッチ化の運用判断が記録されず、都度判断になっている。 | 並行運用の判断基準が steering policy から読め、複数 worktree の並行作業を policy を根拠に進められる。 | 新しい phase や人間ゲートの追加は含めない。 | 生成物化後の並行運用で得た経験を根拠にするため、共有インデックスの生成物化の後に扱う。 |
| Bolt の依存 wave 並行実行 | waiting | 未作成、[Issue #352](https://github.com/amadeus-dlc/amadeus/issues/352) | Construction が Bolt を直列に実行する前提であり、Intent 内の並行加速ができない。 | bolts の依存グラフに基づき、依存のない Bolt を wave 単位で並行実行し、wave ごとに統合と検証を行う契約が Construction skill から読める。 | 複数人での Bolt 分担とリモート実行基盤は含めない。 | 水平並行の運用経験を設計根拠にするため、他の 3 候補の後に扱う。 |

## 候補判断

- recommended は「共有インデックスの生成物化」である。すべての Intent と Discovery が共有インデックスを更新するため、この追記衝突の除去が水平並行全体の前提になる。候補の中で最小サイズであり、再生成の決定論性を validator と eval で検証しやすい。
- 「ゲート待ちキューの可視化」は、並行 Intent が実際に走り始めてから効果が出るため、生成物化の後に扱う。
- 「並行運用ポリシー」は、生成物化後の並行運用で得た経験を policy の根拠にするため、生成物化の後に扱う。新規 Intent ではなく既存 [20260701-git-branching-policy](../intents/20260701-git-branching-policy.md) の更新として扱う可能性があり、Ideation 前の判断点として残す。
- 「Bolt の依存 wave 並行実行」は粒度が最大であり、水平並行の運用経験を設計根拠にするため最後に扱う。

## 既存 Intent との関係

- [20260701-git-branching-policy](../intents/20260701-git-branching-policy.md) は複数 Intent と複数 worktree の作業判断を扱う steering policy の Intent である。候補「並行運用ポリシー」は、この policy への追記になる可能性がある。
- [20260702-phase-gate-approval-contract](../intents/20260702-phase-gate-approval-contract.md) は人間ゲートの承認 evidence 検査を決定論的契約にした Intent である。候補「ゲート待ちキューの可視化」は、この契約が定めた `state.json` と approval evidence を読み取り対象にする。
- [20260702-phase-pr-consolidation-policy](../intents/20260702-phase-pr-consolidation-policy.md) は小さい Intent の phase PR 統合条件を扱う Intent（Ideation 完了）である。直列の往復コスト削減を扱い、この Discovery の並行化と補完関係にあり、重複しない。
- [20260702-state-json-scaffolding](../intents/20260702-state-json-scaffolding.md) は `state.json` 雛形生成の Intent（Construction 完了）である。候補「ゲート待ちキューの可視化」が横断スキャンする `state.json` の構造安定の前提になる。

## 推奨次アクション

- recommended 候補「共有インデックスの生成物化」を GitHub Issue として起票し、`amadeus-ideation` に渡す。
