# Decision Log — Team Mode 起動経路の堅牢化（#1476 / #1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/intent-capture/intent-statement.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/scope-definition/scope-document.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/scope-definition/intent-backlog.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/feasibility-assessment.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/ideation/feasibility/constraint-register.md`

- `intent-statement.md` — Q1/Q2/Q3 の裁定と、その前提となった構造上の含意（`CLAUDE_MONITOR_PROMPT` の per-member 化）を引いた。
- `feasibility-assessment.md` — Q1/Q2 の裁定の根拠となった2実験の実測値を引いた。
- `constraint-register.md` — 各決定が生んだ制約 C-14〜C-21 との対応を示した。
- `scope-document.md` / `intent-backlog.md` — 決定がスコープ境界と backlog へどう反映されたかの参照先。

すべてソロモード（`AMADEUS_OPERATING_MODE` 未設定）につきユーザー直接裁定。エージェント選挙は非適用。

| # | 決定事項 | 裁定 | 日時 | 根拠 | 生じた制約 |
|---|---|---|---|---|---|
| D-1 | #1476 と #1478 の出荷単位 | **ユニットごとに2 PR** | 2026-07-25T10:45Z | 両者は `team-up.sh` 内で非交差の関数を触る。#1476(P1/S2-CRITICAL) の着地が #1478(P2) の未検証事項に待たされない | C-14 |
| D-2 | actas 移行が不成立だった場合の分岐 | **別 readiness 指標へ切替**（撤去・中断はしない） | 2026-07-25T10:45Z | 撤去は #1384 の保護を放棄、中断は到達不能コード約120行を残す。**feasibility 実験2で actas 移行が成立したため本裁定は発動せず** | C-15 |
| D-3 | 本 intent の完了条件 | **実測2点 + テスト構造の是正** | 2026-07-25T10:45Z | テスト構造（sentinel を自前で書く）こそが #1449 の欠陥を2日間 CI で見逃した原因であり、残すと同型の再発を防げない | C-16 |
| D-4 | 検証再有効化に伴う待機設計 | **検証を `mux_attach` の後ろへ移す** | 2026-07-25T11:20Z | 実測 32.2秒/1メンバーの arming を `mux_attach` 前に待つと前 intent(PR #1477)の成果を失う。後方へ移せばアタッチは worktree 作成時間(並列化後 3.3秒前後)で完了し、#1384 の保護と起動の速さを両立できる | C-17 |
| D-5 | 並列 `git worktree add` の並列度 | **固定上限4** | 2026-07-25T11:20Z | 実測の最適値(3.32秒、再現性 3.32/3.72/3.61)。並列度7 は 7.55秒で直列 7.39秒より遅い。動的上限は実測が macOS のみで妥当性未検証のため、実測に接地しない数値を導入しない(cid:requirements-analysis:constants-from-code) | C-6 / C-19 |

## 不採用案とその理由

| 決定 | 不採用案 | 理由 |
|---|---|---|
| D-1 | 1 PR にまとめる | どちらかの未検証事項が解決するまで両方が止まる |
| D-2 | 検証を撤去する | #1384 の保護を放棄することになる |
| D-2 | #1476 を中断し #1478 のみ完結 | 到達不能コード約120行を残したままになる |
| D-4 | バックグラウンド化 | 通知経路の新設を要する |
| D-4 | タイムアウトを実測ベースへ縮める（45秒×1ラウンド等） | 正常系でも数十秒のブロッキングが残る |
| D-5 | CPU コア数ベースの動的上限（`min(4, ncpu/2)` 等） | 実測が macOS のみで動的式の妥当性を検証できない。環境差は RAID R-6 として残す |

## 実測により裁定が不要になった事項

| 事項 | 結果 | 出典 |
|---|---|---|
| actas 移行の可否 | 成立（sentinel が T+32.2秒 に出現） | feasibility 実験2 |
| 並列 worktree の `.git` ロック競合 | 失敗ゼロ（全並列度で成功 7/7、stderr 0 bytes） | feasibility U2 実験 |
| D-2 の分岐の発動 | **発動せず**（actas 移行が成立したため） | feasibility 実験2 |

## 訂正した見込み

| 項目 | 当初（intent-statement） | 実測後 | 出典 |
|---|---|---|---|
| worktree 並列化後の所要時間 | 約1〜2秒 | **3.3秒前後**（7人構成で約4秒短縮） | feasibility U2 実験。RAID R-5 |

## 承認

本 initiative は上記5決定とその根拠に基づき、inception へ引き継ぐ。ideation で確約するリソースは Inception の分析と人間ゲートまでに限定し、Construction の staffing と schedule はユニットと依存が確定した後の Delivery Planning で承認する（Team Formation は SKIP されており named mob を本 brief では確約しない）。
