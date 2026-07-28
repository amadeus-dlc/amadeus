# Intent Backlog — 260727-plugin-verb-skills(proto-Units、MoSCoW)

上流入力(consumes 全数): intent-statement.md(スコープ裁定)、feasibility-assessment.md(シーム実測)、constraint-register.md(C1〜C8)

優先順位は scope-document.md の dependency + risk-first 方針に従う。全項目 Must(ユーザー裁定によるフルスコープ)。

| # | proto-Unit | MoSCoW | 依存 | リスク参照 |
|---|---|---|---|---|
| P1 | plugin CLI へ `install <path>` verb 追加(コピー+compose 委譲、部分失敗の冪等再試行契約) | Must | なし | R3(部分失敗) |
| P2 | `/amadeus plugin <verb>` ユーティリティハンドラ(5 verb の薄い dispatch+usage 文+in-process seam テスト) | Must | P1 | R2(utility.ts 肥大) |
| P3 | `amadeus-plugin` ユーザー起動スキル(amadeus-mirror 様式) | Must | P2 | R4(面の誤記) |
| P4 | runner-gen plugin 対応 — 方式 ADR(R1)+実装+drift guard 整合(A2 実測込み) | Must | ADR(application-design) | R1、A1/A2 |
| P5 | 全ハーネス投影+docs 19-plugins EN/JA 入口更新 | Must | P1〜P4 の面確定 | R4 |

## Walking Skeleton 候補

P1+P2 の最小交差 — 「`/amadeus plugin status` の end-to-end(handler → plugin.ts → 出力)+テスト1本」。install/compose 等の書込系 verb は skeleton 承認後に拡張する。

## Won't(再掲、境界の明示)

#1380 / #1351 / #1126 / trust 境界変更 / バージョン操作 — scope-document.md の Out 節を正とする。
