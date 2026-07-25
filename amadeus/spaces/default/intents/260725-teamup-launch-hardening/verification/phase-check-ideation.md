# Phase Boundary Check — Ideation（260725-teamup-launch-hardening / #1476, #1478）

検証日時: 2026-07-25T11:35Z / 検証者: conductor（ソロモード） / スコープ: amadeus-feature（18 stages）/ Standard depth / Test Strategy Minimal

## トレーサビリティ検証（ideation 成果物 → 上流）

| ステージ | 成果物 | 実在 | 上流トレース |
|---|---|---|---|
| intent-capture | intent-statement / stakeholder-map / questions | ✅ ls 実測 | Issue #1476 / #1478、前 intent `260725-teamup-attach-latency`（PR #1477、マージ済み `8729199589`）の実測 |
| feasibility | feasibility-assessment / constraint-register / raid-log / questions | ✅ | intent-statement の「アプローチ（未確定）」節が挙げた2つの未検証前提を実験対象として消化 |
| scope-definition | scope-document / intent-backlog / questions | ✅ | intent-statement のスコープ節 + feasibility の GO 判定と実測値 |
| approval-handoff | initiative-brief / decision-log / questions | ✅ | 上記すべて |

トレーサビリティの断絶なし。各成果物の冒頭「上流入力（consumes 全数）」行は宣言全数を列挙し、本文で実参照している（装飾トークンなし）。

## feasibility の実測（本 phase の中核成果）

| 実験 | 結果 |
|---|---|
| U1 実験1（actas 単体） | sentinel 未出現。原因は delivery mode が `off` で claude-code ドライバ `template.md:144-148` step 5d が発動しなかったこと（プローブの手順漏れ） |
| U1 実験2（delivery mode = monitor 設定後） | **sentinel 出現 T+32.2秒**。ペインに「受信: leader 宛メッセージのみに制限(monitor モードでリアルタイム受信中)」を確認 |
| U2（並列度スイープ） | 直列 7.39秒 / 並列2 4.88秒 / 3 4.03秒 / **4 3.32秒** / 7 **7.55秒**（直列より遅い）。全並列度で成功 7/7・stderr 0 bytes |

実験環境はいずれも隔離し、実施後に完全撤去した（`git worktree list` が実験前後とも 31件で一致、agmsg team 登録・sentinel・herdr セッションとも残存 0）。

## ゲートの整合

- **運用形態**: ソロモード（`AMADEUS_OPERATING_MODE` 未設定）。選挙・定足数・クロスレビュー2名・delegate 配送は非適用。
- **承認**: intent-capture / feasibility / scope-definition の3ゲートはユーザー直接裁定で approved。
- **§13**: intent-capture 1件、feasibility 2件、scope-definition 1件をユーザー承認のうえ persist（計4件）。
- **センサー**: 各ステージの最終発火で SENSOR_FAILED 増分 0。
- **決定**: D-1〜D-5 を decision-log に確定。不採用案とその理由も記録済み。

## SKIP ステージの扱い

`cid:approval-handoff:c3` / `c4` に従い、SKIP された market-research / team-formation / rough-mockups の成果物を捏造していない。N/A の根拠、代わりに使う内部証拠、後続の decision point を approval-handoff-questions に明示した。特に **Team Formation が SKIP されているため、named mob や Construction schedule を本 phase では確約しない** — Delivery Planning で承認する。

## inception へ引き継ぐ未解決事項

| ID | 内容 | 引き継ぎ先 |
|---|---|---|
| B-4 | `mux_attach` 後へ移した検証の exit code の意味づけ（U1 実装の核心的未確定点） | requirements-analysis（最優先） |
| R-2 | actas 排他ロックが7メンバー同時起動・resume で競合しないか | requirements-analysis / nfr |
| R-3 | actas の受信範囲制限が配送を壊さないか | requirements-analysis |
| R-4 | 並列 worktree の部分失敗時のロールバック | requirements-analysis、実証は build-and-test |
| R-6 | Linux CI 上での並列度特性 | nfr-requirements |

## 一次的な逸脱の記録

feasibility 承認後、conductor がユーザーの明示指示（「#1476/#1478 を別ブランチで始めてほしい」）があるにもかかわらず進行可否の確認質問を挟み、Stop hook 発火を受けて scope-definition 境界で不要な park を行った。ユーザー指摘で unpark し再開。scope-definition の §13 で `cid:scope-definition:no-progress-confirmation-when-instructed` として persist 済み。成果物・状態の欠落はなし。

判定: **ideation 境界の通過可** — 全成果物実在、3ゲート approved、feasibility で両ユニット GO を実測、決定5件を記録、トレーサビリティ断絶なし、SKIP ステージの捏造なし。
