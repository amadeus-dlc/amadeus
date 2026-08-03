# Reliability Design — u4-hook-dispatcher

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 故障契約

| 状態 | 結果 |
|---|---|
| 未知slug | loud exit 1、既知slug一覧 |
| 既知slug・実体不在 | 固定build案内、exit 0 |
| 既知slug・実体あり | stdin/stdout/stderr/exitを透過 |

dispatcher の実行時判定は**当該 slug 単体**の実体実在のみ(FD BR-U4-1 の薄さ契約 — ディレクトリ走査・全数判定を実行時に持たない。旧記述の cross-slug 全数チェックは FD 逸脱のため撤回)。実体不在 = 案内+exit 0、child spawn 失敗 = 非0透過。部分生成(一部実体のみ欠落)の検出は dispatcher の責務ではなく、**build 後の検証(u7 の再現性検査・promote-self の生成完全性)と build 後 smoke(テスト時に10 slug を全起動 — 実行時でなくテストの検査)**が担う。

## 復旧

fresh cloneは`bun run build`で実体を生成すれば次回呼出しから正常化する。dispatcher誤設定は追跡ファイルの通常revertで復旧し、生成面の手修正をしない。
