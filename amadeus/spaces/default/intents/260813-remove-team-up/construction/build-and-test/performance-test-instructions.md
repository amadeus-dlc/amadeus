# Performance Test Instructions — 260813-remove-team-up

上流入力(consumes 全数): `construction/remove-team-up/code-generation/code-generation-plan.md`(Step 1〜8 に性能目標なし)、`construction/remove-team-up/code-generation/code-summary.md`(検証は pass 件数と typecheck/lint/git ls-files。レイテンシ・スループットの計測値なし)。

## 適用外判定

**判定: 適用外(専用の性能試験を作らない)。**

要件が宣言する非機能要件は次の 3 件で、いずれも合否を決める数値性能目標を持たない。

| NFR | 内容 | 数値目標 |
|---|---|---|
| NFR-1 | Comprehensive。不在回帰を 1 本以上 | なし(存在検査) |
| NFR-2 | 公開 CLI `/amadeus` のソロ経路は変えない | なし(互換) |
| NFR-3 | typecheck / lint / source-only / 隔離 2 回 build | なし(再現性。壁時計上限ではない) |

数値目標が無いベンチマークは検証劇場になるため作らない。Test Strategy は Comprehensive だが、stage 契約 Step 4-8 は `performance-test-instructions.md` を **IF NFR performance requirements exist** の条件付きとしている。

## この判定を覆す条件

1. requirements がランチャ削除や glossary 投影に時間上限・退行上限を数値で宣言する。
2. 削除後の doctor / ビルドが CI 予算を逼迫する実測が出る。
