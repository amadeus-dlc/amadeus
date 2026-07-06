# Initiative Brief：Amadeus skill 英語化実施計画

## 目的と成功条件

この Intent は、Amadeus skill の英語化を小さい土台 PR から段階的に進めるため、GitHub Issue #399 を親タスクとして扱う。

成功条件は、#395、#400、#401、#402 の順序、依存関係、完了境界、完了状態を追跡できることである。

#401 では、#391、#392、#393、#394 の扱いを #401 の完了証拠として追跡する。

## スコープ境界

対象: #395、#400、#401、#402 の順序、依存関係、完了境界、完了状態の追跡。

対象: #401 の完了証拠としての #391、#392、#393、#394 の扱いの追跡。

対象外: #391、#392、#393、#394 個別の完了そのもの。

対象外: Operation phase skill の実装。

対象外: 英語化そのものの一括実施。

## バックログ要約

| 項目 | 優先度 | 依存 | 完了証拠 |
|---|---|---|---|
| #395 方針確定 | Must | なし | 対応 PR の merge または明示的な Issue close |
| #400 小さい土台 PR | Must | #395 | 対応 PR の merge または明示的な Issue close |
| #401 AI-DLC v2 差分対応順序 | Must | #400 | 対応 PR の merge または明示的な Issue close。#391〜#394 の扱いを確認する。 |
| #402 残り展開単位 | Must | #401 | 対応 PR の merge または明示的な Issue close |

## 制約

- Amadeus DLC が生成する成果物は日本語で維持する。
- `skills/amadeus*/` から `.agents/skills/amadeus*/` への反映は昇格フローを使う。
- PR 作成後は CI、レビューボット、コメントを監視する。
- merge は人間が行う。
- 子 Issue の完了は、対応 PR の merge または明示的な Issue close で観測する。

## 体制

Maintainer は、完了境界、PR、merge 可否を判断する。

Agent は、Amadeus DLC 成果物と GitHub Issue の対応を維持しながら作業する。

Reviewer は、英語化 PR の主旨、意味変更、翻訳差分、検証結果を確認する。

Team Formation は、小規模な自己開発体制であり、チームキャパシティや mob 構成の判断が不要なため skip した。

## モック

UI は対象外である。

Rough Mockups では、#399 親 Issue と #395、#400、#401、#402 の完了証拠を追跡するシステム相互作用図を作成した。

- [wireframes.md](../rough-mockups/wireframes.md)
- [user-flow.md](../rough-mockups/user-flow.md)

## Inception への引き継ぎ

Inception では、#395、#400、#401、#402 を要求、作業単位、Delivery Planning の入力として扱う。

特に #395 から #402 までの順序を崩さず、#401 では #391〜#394 の扱いを #401 の完了証拠として確認する。

PR merge または Issue close で確認できない子 Issue は完了扱いにしない。
