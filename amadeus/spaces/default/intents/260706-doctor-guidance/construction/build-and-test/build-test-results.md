# build-test results（260706-doctor-guidance）

上流入力: [build-instructions.md](build-instructions.md) ほか本ステージの instructions 4 件。

## 実行結果（2026-07-06T08:50:06Z、fresh 実行）

| コマンド | 結果 |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm run test:all` | exit 0（#554 doctor 警告 / #451 smoke 領域の既存 eval 含む全連鎖 pass） |
| `bun run dev-scripts/evals/installer/check.ts` | ok（#573 11 検査 + 既存全検査） |
| `npm run parity:check` | ok（39 skills、199 engine files、基準 commit b67798c3） |
| validator（260706-doctor-guidance 指定） | pass（不足・矛盾なし） |

## TDD 証跡

- RED: 実装前に 7 検査 FAIL（installer「installed but smoke check failed」、doctor exit 1 + dist/ 文言、advisory marker 不在、破損時 fix の旧文言）。birth 後の 3 検査は現行挙動で pass = FR-1.3 の回帰ガード。
- GREEN: 11/11 ok。初回 birth は実 CLI 実行（proxy なし）。
詳細は [code-generation-plan.md](../doctor-guidance/code-generation/code-generation-plan.md)。

## 失敗と対処

- FR-3.2 の破損状態シナリオを実測で精密化した（doctor の shell 検査は harnessDir() = 導入先の .claude/ を見るため、.agents だけでなく .claude も削除）。
- reviewer Low 2 件（検査数記載、dist/ assertion の行限定）を即修正し再 GREEN。Medium 1 件（marker hardcode）は挙動 eval が片側 drift を検出することを裏取りして非対応（diary に反証記録）。
