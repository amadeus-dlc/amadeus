# Feasibility Questions — 260706-installer-versioning（Issue #543）

上流入力: [feasibility-assessment.md](feasibility-assessment.md)、[market-research-questions.md](../market-research/market-research-questions.md)

## 全メンバー同報ピア協議（2026-07-06T09:05 頃発信、期限 15 分・回答 1 件で成立）

market-research の 5 論点に bootstrap（実測で発見）を加えた 6 問を、実測前提付きで全 6 名へ同報した。

| # | 論点 | 候補と推奨 | 状態 |
|---|---|---|---|
| Q1 | バージョン値 | A=配布元 commit + 導入時刻（推奨）/ B=semver 新設 / C=commit のみ | [Answer]: A（全会一致） |
| Q2 | ハッシュアルゴリズム | A=sha256（推奨。repo 唯一の現役慣行）/ B=md5 | [Answer]: A（全会一致。parity / provenance の sha256 と意味論一貫 = engineer1 / engineer4） |
| Q3 | 改変検出時の戦略 | A=退避型（推奨。収束 = 配布契約と整合）/ B=併置型 .new / C=範囲別併用 | [Answer]: A（全会一致。B はエンジン改変が生き残り engine e2e 前提を壊す = engineer4） |
| Q4 | 削除されたファイル | A=再作成（推奨。収束維持）/ B=削除を尊重 | [Answer]: A（全会一致。B はエンジン完全性と矛盾 = engineer5） |
| Q5 | 適用範囲 | A=コピー対象全ファイル一律（推奨）/ B=文書限定 | [Answer]: A（全会一致） |
| Q6 | bootstrap | A=不一致なら退避して上書き（推奨。保守的）/ B=無条件上書き + 告知 / C=明示 flag | [Answer]: A（全会一致。無言の失敗禁止と同型 = engineer4） |

## 協議記録（2026-07-06T09:01 受領、成立）

- 参加者: reviewer（Codex）、engineer1、engineer4、engineer5（4 名回答 + 発信者推奨）。engineer3 は期限内回答なし（担当 Intent 実行中）。
- 結果: Q1〜Q6 すべて A の全会一致。採用判断 = engineer2（発信者）。decision 記録済み。
- 補強の採用: (1) 退避の配置は集中退避 dir `.amadeus-install-backup/<導入時刻>/`（相対 path 保存）— BR-13 干渉（engineer1）と複数回更新の衝突（reviewer）を同時解決。(2) #533 guide Updating 節への追随を実装確定時に engineer5 へ一報。(3) 自己導入ケースで退避物が lint / parity 走査に混ざらないか実装時確認（engineer4）。(4) smoke 告知には #573 の固定 marker 機構が利用可能（engineer1）。
- 契約級のエスカレーション: 不要（配布契約の改定を含まない。収束意味論は維持され、退避は追加の保全機構）。
