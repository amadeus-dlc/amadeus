# 既存コード分析

## 対象コード

| 対象 | 種別 | 確認内容 |
|---|---|---|
| `.amadeus/steering/policies/git-branching.md` | 既存 policy | branch lifecycle（起点、基準 branch、branch 名、追従、PR 作成前検証、PR 作成、phase PR の統合、PR 監視、merge、merge 後処理）を扱う。単一 branch の lifecycle が対象であり、複数 worktree の並行判断（並行させる単位、共有成果物の統合運用、Bolt 直列化、承認キュー運用）は扱っていない。 |
| `.amadeus/steering/policies.md` | policy 索引 | `方針`、`禁止事項`、`判断基準` の見出しを持ち、判断基準が Intent 成果物の decision へ根拠リンクする形式（provenance-mechanization D001 参照の先例）が確立している。Git Branching Policy への参照行がある。 |
| `.amadeus/steering/policies/README.md` | policy 詳細入口 | `役割`、`登録済み policy` の表、`記録方針` を持つ。新規 policy はこの表への行追加で登録する。 |
| `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts`（397〜401 行付近） | validator 実装 | `policies.md` の存在と見出し（方針、禁止事項、判断基準）、`policies/` ディレクトリ、`policies/README.md` の存在と見出し（役割、記録方針）を構造検査している。個別 policy ファイルの内容検査はない。 |
| `.amadeus/intents/20260702-shared-index-generation/**`、`.amadeus/intents/20260702-gate-queue-visualization/**` | 観察根拠 | 並行運用の実例の記録元。#334 cycle（並行 branch の統合、マージ後再生成、Bolt 直列実行）と #350 cycle（#350 と #351 の Ideation の並行、衝突面判断による並行可否の整理、GateQueueList による承認キュー確認、Issue #274 の遡及承認）が成果物として追跡できる。 |
| `.agents/skills/amadeus-validator/scripts/GateQueueList.ts` | 同梱スクリプト | 承認待ちキューの一覧手段。ゲート承認の運用（承認キューの確認、詰まりの検出）の実行入口として policy から参照できる。 |

## 既存能力

- policy の記録構造（`policies.md` 索引、`policies/` 詳細、README の登録表、判断基準から Intent 成果物への根拠リンク形式）が確立しており、新規 policy はこの構造への追加で成立する。
- git-branching.md に `責務分担` 見出しの先例（AGENTS.md との重なりの整理）があり、新規 policy との責務分担も同じ形式で書ける。
- 承認キュー運用の実行入口（`GateQueueList.ts`）と共有インデックスの再生成（`IndexGenerate.ts`）が配布済みで、policy の判断基準が参照できる実行手段が揃っている。

## 統合点

- 新規 policy は `.amadeus/steering/policies/parallel-operation.md` に置き、`policies.md` の方針または判断基準と `policies/README.md` の登録表から参照できる（G001 確定判断）。
- git-branching.md の `責務分担` と新規 policy の `責務分担` で、単一 branch lifecycle と複数 worktree 並行判断の境界を相互に明記できる。
- 判断基準の根拠は、#334 と #350 の Intent 成果物（notes、traceability、decisions、PR）への参照リンクで記録できる。

## ギャップ

- 並行させる単位の判断基準（衝突面の列挙による並行可否、amadeus-validator など同一 skill への接触集中の回避）が記録されていない。
- 共有成果物の統合手順（マージ後の `origin/main` 追従と再生成の順序）が policy として記録されていない（git-branching.md は追従のみ扱う）。
- 同一 worktree での Bolt 直列化と、worktree 間の並行の使い分けが記録されていない。
- ゲート承認の運用（承認キューの確認手段、承認のバッチ処理、承認記録が取り残された場合の遡及承認）が記録されていない。
- `policies/README.md` の登録表と `policies.md` に新規 policy への参照がない。

## リスク

- git-branching.md との責務の重なり。統合手順や PR 運用は既に git-branching.md にあり、新規 policy が同じ内容を再定義すると判断基準が分散する。責務分担の明記と相互参照で重複を避ける必要がある。
- 判断基準を観察より先に広げると推測設計になる。観察済みの実例に根拠がある範囲だけを規則化する（調査解消済みの判断）。
- policy は steering 共有資産のため、他の並行作業と `policies.md` と README の索引行で接触する可能性がある（行追加のみで衝突面は小さい）。

## Inception への入力

- 要求は、並行させる単位の判断基準、共有成果物の統合手順、ゲート承認の運用、既存 policy との責務分担、索引への登録に分けられる。
- Unit は、並行運用ポリシーの契約を核とした単一の価値境界にまとめる構成が候補になる（判断基準は相互に依存し、独立に価値を提供できない）。
- Bolt は、(1) policy 本文の作成と索引登録、(2) 既存 policy との責務分担の整合（git-branching.md への相互参照追記を含む）、に分けられる見込みである。
- Construction では文書変更が中心で、validator の構造検査追加の要否を Functional Design で確定する。

## 証拠

| 種別 | 参照 | 内容 |
|---|---|---|
| file | `.amadeus/steering/policies/git-branching.md` | branch lifecycle の網羅範囲と `責務分担` 見出しの先例確認。 |
| file | `.amadeus/steering/policies.md` | 索引の見出し構造と判断基準の根拠リンク形式の確認。 |
| file | `.amadeus/steering/policies/README.md` | 登録済み policy 表への行追加方式の確認。 |
| file | `.agents/skills/amadeus-validator/validator/AmadeusValidator.ts` | policies の構造検査（397〜401 行付近）の確認。 |
| file | `.agents/skills/amadeus-validator/scripts/GateQueueList.ts` | 承認キュー確認の実行入口の実在確認。 |
| command | `bun run .agents/skills/amadeus-validator/scripts/GateQueueList.ts .` | 承認待ち 0 件表示の実測（2026-07-02、Issue #274 遡及承認後）。 |

## 鮮度

| 項目 | 値 |
|---|---|
| analyzedCommit | edebc629 |
| analyzedAt | 2026-07-02T21:57+09:00 |
| freshness | current |

## 未確認事項

- validator に個別 policy ファイルの構造検査（`parallel-operation.md` の存在と見出し）を追加するかは、Construction Functional Design で確定する。
- policy 本文の見出し構成（git-branching.md の目的、対象、責務分担の形式を踏襲するか）は、Construction Functional Design で確定する。
