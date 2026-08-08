# Security Test Instructions — 260807-stage-perf-report

上流入力(consumes 全数): code-generation-plan(Step 9 の FR-7a read-only 検査ステップを設計として消費)、code-summary(security-design 由来の是正 — 信頼境界外入力の扱い — の実績を対象として消費)

## 対象 NFR / 攻撃面

対象は単発実行・ローカル完結・read-only の CLI。認証・秘密情報・ネットワーク受信面を持たないため、**SAST/DAST・認証試験・注入試験は非該当**(nfr-design:c1 — 常駐サービス向けセレモニーを機械適用しない)。実在する攻撃面は次の 2 つに閉じる:

1. **書込の不在**(FR-7a): ツールが監査・record を破壊しないこと
2. **信頼境界外データの取り扱い**(security-design): 監査シャードと record は「壊れうる/敵対的でありうる」入力

## 実施する検査

| 検査 | 実装 | 内容 |
|------|------|------|
| 書込 API の不在 | `t487`「no filesystem write API is imported or referenced by the tool」 | ソースを実読し `node:fs` の**値** import が `readFileSync` / `readdirSync` のみであること(型 import は除外)、`writeFileSync` 等の書込 API 語彙が 0 件、`node:fs/promises` 不参照 |
| 実行の副作用不在 | `t487`「the space tree is byte-identical after a run」 | 実行前後で space ツリー全ファイルが byte 不変 |
| レンダラのサニタイズ | `t486`「a stage name with control bytes and a newline is reduced at the render point」 | コーパス由来の値が制御バイト・改行を持っても出力の行構造を壊さない |
| CSV 列偽造の防止 | `t486`「a csv cell with a comma and a quote cannot forge an extra column」 | 引用符の二重化と囲みで列境界が保たれる |
| 不正入力での非クラッシュ | `t487` の破損行・読取不能シャード fixture | parse 失敗が例外でなくバケット計数へ収束 |

```bash
bun test tests/unit/t486-stage-stats.test.ts tests/integration/t487-stage-stats.integration.test.ts --timeout=30000
```

## リポジトリ全体の依存監査

対象変更のセキュリティ回帰(上記)とリポジトリ全体の dependency audit は**別判定**とする(cid:build-and-test:c1-doctor-seam)。本 intent は依存を追加していない(`node:fs` / `node:path` / 既存の `amadeus-journal.ts` のみ)。
