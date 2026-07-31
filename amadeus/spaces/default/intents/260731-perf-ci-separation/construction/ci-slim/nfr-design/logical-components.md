# Logical Components — U3 ci-slim

上流入力(consumes 全数): business-logic-model.md(U3 FD)。nfr-requirements 5成果物は本 scope で同ステージ SKIP のため設計上不存在(consumes_absent expected:true)— requirements.md の FR-3/AC-3 と FD の照合ロジックを一次根拠に具体化する。

測定 ref = observed `da51af375`。

## 論理構成(business-logic-model.md の写像)

| 論理コンポーネント | 実体 | 契約 |
|---|---|---|
| 削除面 | ci.yml 3 job(:224-291) | 削除のみ・追加行なし |
| 不変面 | tests / coverage-* / distribution-contract / ci-success needs 8項 | byte-identical |
| 照合面 | FR-3d 対照表 V-1〜V-6 + AC-3 grep | PR 本文で機械照合 |

## 境界

- .github/workflows/ci.yml のみ接触(tests/・docs/・core 無接触)
