# Reliability Design — U4 docs-sync

上流入力(consumes 全数): business-logic-model.md(U4 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-6/NFR-1(ii) と FD の台帳ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 陳腐化防止

- business-logic-model.md ロジック1 の Bolt 冒頭再 grep で U1〜U3 着地による対象増を捕捉(鮮度検査)
- 件数語は隣接列挙原則(BR-U4-3)で構造的陳腐化を防止
- doc-consuming ガード(BR-U4-6)の grep 確認で latent 赤(ci-paths-ignore-doc-guard-blindspot 類型)を予防

## 回復経路

文書のみ — revert 自明。
