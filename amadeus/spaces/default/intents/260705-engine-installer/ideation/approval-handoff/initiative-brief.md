# Initiative Brief（260705-engine-installer）

対象 Issue: [#451](https://github.com/amadeus-dlc/amadeus/issues/451)
上流確定判断: [grilling 転記コメント](https://github.com/amadeus-dlc/amadeus/issues/451#issuecomment-4887231697)

## 概要

エンジンの copy 配布を成立させるインストーラ（リポジトリ内 TS スクリプト）を設計・実装する。フルセット（エンジン 7 dir + skills 2 系統 + symlink 配線 7 entry + settings.json hooks マージ + AMADEUS.md）を 1 コマンドで配置し、冪等な再実行と `aidlc/` 不可侵を保証する。検証は 3 層分担（スモーク / 専用 eval / README 手順）とする。

各成果物の要点は次のとおり（詳細は各リンク先）。

| 領域 | 要点 | 出所 |
|---|---|---|
| 問題と成功指標 | 正準手順の不在（主）+ #441 検証不能（従）。受け入れ条件 = 1 コマンド / cold cache + オフラインで全 tools・hooks 動作 / 冪等 / README 手順 | [intent-statement.md](../intent-capture/intent-statement.md) |
| 導入方式 | リポジトリ内 TS スクリプト採用（dist / bunx / 手順書のみは却下）。外部ツール流用なし | [competitive-analysis.md](../market-research/competitive-analysis.md)、[build-vs-buy.md](../market-research/build-vs-buy.md) |
| 実現性と制約 | 全機構が Bun 標準 API + 既存資産で実現可（実測済み）。制約 CON-1〜10（aidlc 不可侵、hooks 限定マージ、symlink 再作成、TDD ほか） | [feasibility-assessment.md](../feasibility/feasibility-assessment.md)、[constraint-register.md](../feasibility/constraint-register.md) |
| リスク | R-1 並行 Intent のレイアウト変更（マニフェスト集約 + eval 検査で緩和）、R-2 既存実体 dir 衝突、R-3 JSON マージ | [raid-log.md](../feasibility/raid-log.md) |
| 範囲 | In: インストーラ本体 / 専用 eval / README 手順 / AMADEUS.md 扱い確定。Out: bunx 公開、Windows、#441、rules 配布。単一 PR | [scope-document.md](../scope-definition/scope-document.md) |
| 体制 | engineer2 単独（多体連携 3 周目）、mob なし、gate は包括委任の auto 中継 | [team-assessment.md](../team-formation/team-assessment.md) |
| CLI 骨子 | 5 工程の逐次表示、非対話 1 コマンド完結、失敗時は回復案内 | [wireframes.md](../rough-mockups/wireframes.md) |

## Inception への引き渡し

- ブロッカーなし。残実装判断 3 件を Inception で確定する: (1) スクリプトの置き場所と命名、(2) AMADEUS.md の利用者向け再構成の程度、(3) settings.json マージ詳細（feasibility の一次調査 = hooks 配線のみ、eval A-1 で担保）。
- requirements-analysis 以降で、配布マニフェスト（コピー対象・symlink 一覧・マージ規則）の契約と eval の検証項目を確定する。
