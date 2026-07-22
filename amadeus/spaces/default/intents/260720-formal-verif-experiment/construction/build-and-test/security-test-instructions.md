# Security Test Instructions

上流入力(consumes 全数): code-generation-plan.md, code-summary.md

## NFR 由来のセキュリティ検証(devsecops 観点)

| 検証点 | 方法 | 期待 |
| --- | --- | --- |
| blind 境界の禁止入力混入 | `bun test tests/integration/t-formal-verif-arm-s-blind.integration.test.ts`(実 FS 走査) | 禁止 module import 0 件・allowlist 厳密一致 |
| freeze manifest の実測性 | `bun test tests/unit/t-formal-verif-arm-s-run.test.ts`(clean=0 / poisoned=1 の両側) | ハードコード検証劇場の不在 |
| 制御バイト混入 | `grep -rP '[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]' scripts/formal-verif/` | 0 件(control-byte-guard) |
| 秘密情報ハードコード | `grep -rniE "api[_-]?key|secret|token|password" scripts/formal-verif/` | 実クレデンシャル 0 件 |
| 依存追加 | `git diff <base> -- package.json bun.lock` | 新規 runtime dependency 0(Bun-only Forbidden) |

## SAST 相当

- Biome lint(既存 CI gate)+ `tsc --noEmit` strict を SAST の代替床とする。追加スキャナは導入しない(攻撃面が CLI ローカル実行のみ・ネットワーク境界なしのため比例選定 — build-and-test:c3)
