# Initiative Brief — 260719-ballot-failclosed-amend

上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、feasibility-assessment.md、constraint-register.md

## 概要

選挙 CLI(`scripts/amadeus-election-*.ts`)の ballot 受理境界を fail-closed 化する。intent-statement.md の2目標 — #1252(submittedAt 様式無検証の bug、P2/S3-MAJOR)と #1253(amend 提出経路不在の enhancement、P3)— を、feasibility-assessment.md の GO 判定と scope-document.md の Must 5点/Won't 6点の範囲で同一 intent として実装する。

## Inception への引き継ぎ物

| 成果物 | 内容 | 後続の消費先 |
| --- | --- | --- |
| scope-document.md | Must M-1〜M-5 / Won't W-1〜W-6、境界判定規則(ballot 受理境界の内側か) | requirements-analysis の FR 導出元 |
| intent-backlog.md | B-1〜B-4(risk-first: B-3 裁定が B-2 実装に先行) | units-generation / delivery-planning |
| constraint-register.md | C-1〜C-7(t238 非交差、amend 裁定前提、検証コマンド) | 全 construction ステージ |
| raid-log.md | R-1〜R-3 / A-1〜A-2 / I-1 / D-1〜D-2 | requirements 以降で現存再実測(feasibility:c2) |

## SKIP ステージの N/A 根拠(approval-handoff:c4)

- market-research / team-formation / rough-mockups は amadeus スコープの SKIP。存在しない競合分析・チーム編成文書・wireframe は補完しない。代替内部証拠: 編成はユーザー承認済み leader ディスパッチ(2026-07-19T15:00:57Z)、UI は存在せず(CLI 契約のみ — ui-less-mockups-as-output-contract の適用は refined-mockups も SKIP のため不要)、市場妥当性は実運用事故(E-CCCRA)の実測が代替する。
- リソース確約は Ideation の範囲に限定し、named mob・Construction schedule は捏造しない(approval-handoff:c3)— staffing は delivery-planning で確定する。

## リスクと緩和(ゲート提示用 — approval-handoff:c1)

- R-1(amend 二重計上)→ 緩和: B-3 選挙裁定を実装前提に固定済み(C-4)。代替緩和: 裁定不能時は amend 経路を hold し #1253 を分離 park する(スコープ縮小、ユーザーエスカレーション)。
- R-2(regex 過剰厳格化)→ 緩和: normalizeAt mint 正規形との整合+corpus 遡及 sweep。代替緩和: 受理形を mint 形限定でなく ISO-8601 拡張形まで許すかは requirements で確定する。
- R-3(t238 交差)→ 緩和: W-1 除外+交差時 leader 報告の直列化手順が確定済み。
