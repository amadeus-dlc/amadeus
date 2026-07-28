# Initiative Brief — 260727-plugin-verb-skills

上流入力(consumes 全数): intent-statement.md、scope-document.md、intent-backlog.md、feasibility-assessment.md、constraint-register.md

## 何を(What)

plugin 機構の運用入口を他機能と対称にする: (a) `amadeus-plugin.ts` へ `install <path>` verb 追加 (b) `/amadeus plugin <status|compose|drop|doctor|install>` ユーティリティハンドラ (c) `amadeus-plugin` ユーザー起動スキル(amadeus-mirror 様式) (d) runner-gen の plugin 対応(compose 済み stage への `/amadeus-<slug>` 生成、#1598) (e) 全ハーネス投影+docs(19-plugins EN/JA)入口更新。詳細は scope-document.md の CAP-1〜5。

## なぜ今(Why now)

前提の #1596(ホストルート統一・conformance E2E)が 2026-07-27 に着地し plugin バグ 0 件。機構の正しさ確保後の最優先が入口整備(P2 #1597)であり、ユーザー裁定(2026-07-27T14:58:20Z)で #1598 を同乗させたフルスコープが確定した(intent-statement.md)。

## 実現可能性と制約

feasibility-assessment.md: 判定 GO — 全シームがリポジトリ内に実在・実測済み(utility dispatch / plugin.ts 4 verb / mirror スキル様式 / runner-gen 正本)。外部依存なし。制約は constraint-register.md C1〜C8(正本/dist 同期、t258 境界語彙、trust 境界不変、CI ゲート群)。

## 実行計画の骨子

intent-backlog.md の P1〜P5(dependency + risk-first)。walking skeleton = 「`/amadeus plugin status` の end-to-end 薄スライス」を最初の Bolt としてゲートする(amadeus-feature スコープの Mandated)。残リスクは raid-log R1(#1598 方式 ADR)/R2(utility.ts 肥大)/R3(install 部分失敗)/R4(docs 面誤記)。

## リソースと承認境界

ソロモード・単一 conductor。Inception(requirements 以降)の分析は本 brief の承認で開始する。Construction の staffing/schedule はここで確約しない(approval-handoff:c3 — Team Formation SKIP 時に named mob や schedule を捏造しない)。PR マージは個別人間承認(no-AI-merge)。

## SKIP ステージの取り扱い(approval-handoff:c4)

- market-research: N/A — 内部開発フレームワークの入口整備であり市場調査対象が存在しない。代替根拠 = upstream 2.3.0 の deferred 宣言(#1597 本文の verbatim 引用)
- team-formation: N/A — ソロモード。代替 = 本 brief の承認境界節
- rough-mockups: N/A — UI なし CLI/スキル。出力様式は既存兄弟(amadeus-mirror、既存 verb の出力)の既習様式に揃える(ui-less-mockups-as-output-contract は requirements 段で verb 別出力契約として充足する)
