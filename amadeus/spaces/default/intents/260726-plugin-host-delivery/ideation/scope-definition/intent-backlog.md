# Intent Backlog — plugin-host-delivery(proto-Units)

> 上流入力(consumes 全数): intent-statement、feasibility-assessment、constraint-register
> 優先順位は MoSCoW + risk-first / 依存優先(scope-document のスコープ境界の原則)。行数見積りは units-generation で数値化するため本段では相対規模(S/M/L)に留める。すべて intent-statement 成功指標へ trace する。

## Must(出荷条件 — intent-statement 成功指標 1-10 の全数)

| # | proto-Unit | 概要 | 依存 | 相対規模 | trace |
|---|---|---|---|---|---|
| B1 | harness-capability-matrix | 7 ハーネスの導入機構・フック語彙・root 解決を実測し、方式(native / folder-drop / manual)と degrade 契約を確定(feasibility R-1/R-2 の解消) | なし(最初) | M(調査+文書) | 指標 1 |
| B2 | compose-cli-entry | compose / doctor / drop の CLI 到達経路(全ハーネス共通の手動床)。既存 engine 呼び出しのみ | B1 | S-M | 指標 3(手動面)、5 |
| B3 | host-projection-packaging | package.ts の投影拡張: host manifest / marketplace metadata / hook / 内容を中立正本から生成、drift ガード編入 | B1 | M-L | 指標 2 |
| B4 | hook-auto-compose | 対応ホストのフック(SessionStart 相当)から compose 自動起動+再コンパイル。no-op 高速路で起動レイテンシ退行を防ぐ(feasibility R-3) | B2, B3 | M | 指標 3 |
| B5 | normal-scope-integration | compose 後の通常 scope 実行でプラグインステージ・additive contribution が利用可能なことの E2E 固定(walking skeleton の中核) | B2 | S-M(エンジン既存配線の検証中心) | 指標 4 |
| B6 | doctor-observability | doctor へのプラグイン状態行(installed / composed / drift / dropped surfaces)追加 | B2 | S-M | 指標 1(degrade 可観測)、5 |
| B7 | fmc-activation-policy | formal-model-check の activation policy ADR(application-design ゲート裁定)+実装。`--single` 必須 UX 解消 | B5 | S-M(policy 実装は小、ADR が主) | 指標 8 |
| B8 | conformance-suite | 上流 t188 32 ケースの追跡表+Amadeus 適合テスト(compose 意味論はハーネス非依存 1 回、投影・trigger はハーネス別)(feasibility R-4 の層別) | B3, B4, B5 | L | 指標 6, 7 |
| B9 | docs-sync | 利用者ガイド(19-plugins 両言語)を実装済み手順と一致させる | B2-B6 着地後 | S | 指標 9 |
| B10 | upstream-sync-report-extension | upstream sync レポートの判定根拠にプラグイン適合テスト結果を編入 | B8 | S | 指標 10 |

## Won't(本 intent では出荷しない)

plugin 独自 scope / `adds.scopes` / `adds.requires_stage` / `when:` 一般評価 / agents・memory・knowledge 投影 / lockfile / #1380 skills 貢献面(scope-document OUT のとおり)

## Walking Skeleton(最初の Construction Bolt の狙い)

**Claude Code 1 ハーネスで「install → 自動 compose → 通常 scope 実行にプラグインステージが現れる → drop → baseline 復元」の利用者 E2E** を最小構成で貫通する(B2 の CLI 床+B3 の claude 投影+B4 の claude hook+B5 の統合検証の最小断面)。`amadeus-feature` スコープにつき skeleton Bolt は単独ゲート(constraint-register O2)。

## シーケンス根拠

B1 が全ての前提(未実測 seam の解消 — risk-first)。B2(手動床)は B4(自動)より先 — 床が全ハーネスの degrade 契約を支えるため。B8 は投影・trigger・統合が揃ってから層別で固定。B9/B10 は実装確定後の同期(先行すると偽装文書化)。
