# Scope Document — 260727-plugin-verb-skills

上流入力(consumes 全数): intent-statement.md、feasibility-assessment.md、constraint-register.md

intent-statement.md のスコープ裁定(2026-07-27T14:58:20Z、#1597 フル + #1598 同乗)を、feasibility-assessment.md の GO 判定と constraint-register.md の C1〜C8 制約の下で能力単位に確定する。

## In(Must — 全項目。ユーザー裁定によりフルスコープ、Should/Could は置かない)

| Cap | 能力 | 出典 |
|---|---|---|
| CAP-1 | `install <path>` verb を `amadeus-plugin.ts` CLI に追加(folder-drop コピー+compose の1操作化、compose 承認ゲート経由の trust 境界不変) | #1597 提案4 |
| CAP-2 | `/amadeus plugin <status\|compose\|drop\|doctor\|install>` ユーティリティハンドラ(`amadeus-utility.ts` に薄い dispatch、11-contributing.md チェックリスト準拠) | #1597 提案1 |
| CAP-3 | ユーザー起動スキル `amadeus-plugin`(`.claude/skills/`、amadeus-mirror 様式のガード付きライフサイクル操作) | #1597 提案2 |
| CAP-4 | runner-gen の plugin 対応 — compose 済み plugin stage に `/amadeus-<slug>` stage-runner を生成(方式は ADR で選定 = raid-log R1) | #1598 |
| CAP-5 | 全ハーネス投影(dist×7 + self-install)+ docs(19-plugins EN/JA)の入口を raw CLI からスキル/ハンドラへ更新 | #1597 提案3 |

## Out(Won't — 本 intent では実装しない)

- plugin の skills 貢献面(#1380)、book-plugin 再編(#1351)、opencode hook 実測(#1126)
- compose の trust 境界(承認ゲート・三層 digest 検証)の変更 — install は既存経路への委譲のみ(C6)
- バージョンバンプ・リリース操作(C8)
- 汎用 plugin マーケットプレイス的機構・リモート取得(install はローカル path のみ)

## 依存とシーケンス方針(dependency + risk-first)

1. **CAP-1 → CAP-2**: handler は CLI verb の存在に依存(install を先に CLI へ)
2. **CAP-4 は ADR 依存**(R1: compose 時ホスト側生成 vs runner-gen 拡張)— 設計確定後に独立実装可能
3. **CAP-3 / CAP-5 は末端**(handler・runner の確定後に表層とドキュメントを固定)
4. walking skeleton(amadeus-feature スコープの Mandated): 最初の Bolt は「`/amadeus plugin status` が handler 経由で end-to-end 動作+テスト」の薄いスライスとし、ゲートで確認後に残能力へ拡張する

## 成功基準(intent-statement の Success Metrics を能力へ対応付け)

- CAP-1〜2: `/amadeus plugin <verb>` 5 verb が全ハーネス投影で動作、判別 union の機械マッピングにテスト
- CAP-3: `/amadeus-plugin` スキルが存在し docs から参照される
- CAP-4: compose 後に `/amadeus-<slug>` runner が生成され、drift guard と非衝突(A2 の実測確定込み)
- CAP-5: 19-plugins EN/JA 同一変更同期、CI 全 green(C5)
