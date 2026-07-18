# Tech Stack Decisions — fix-1170-retreat-guard(nfr-requirements)

上流入力(consumes 全数): business-logic-model.md、business-rules.md、requirements.md、technology-stack.md

## 決定

| # | 決定 | 根拠 |
|---|---|---|
| T-1 | 新規 runtime dependency ゼロ(Bun 標準+リポ内シンボルのみ) | NFR-3/T1(Bun-only Forbidden) |
| T-2 | 実装言語・様式は既存 amadeus-utility.ts の TypeScript/ESM・既存 import 群に従う — withAuditLock(:91)・parseCheckboxes(:68)とも既存 import を再利用し**新規 import ゼロ**(reviewer Minor 1 是正: parseCheckboxes は :68 で import 済み・:294/:321/:3267 で使用中) | team-practices.md Code Style 写像 |
| T-3 | テストは bun test(tests/unit + tests/integration)— fs 実 FS を使う検証は integration 層(fs-tests-integration-first) | FR-4a、team-practices.md |
| T-4 | 配布は既存 scripts/package.ts + promote:self のフロー(dist 6ツリー+self-install)— 新規配布経路なし | NFR-2 |

## 現行スタックとの整合(technology-stack 由来)

technology-stack.md(Bun/TypeScript/ESM、Biome lint、tsc --noEmit)と全決定が整合 — スタック変更ゼロ。
