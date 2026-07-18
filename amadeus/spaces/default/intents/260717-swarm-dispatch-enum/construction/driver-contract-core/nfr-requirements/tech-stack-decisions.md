# Tech Stack Decisions — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## 決定

- TSD-1: 既存スタックのみ使用 — TypeScript/ESM+Bun 直接実行(`technology-stack.md` の現行構成)。新規依存ゼロ(Bun-only Forbidden 承継)
- TSD-2: 実装位置は `packages/framework/core/tools/amadeus-swarm.ts`(正本)のみ。dist への反映は U3 の生成経路(`business-rules.md` の C1 単一始点と unit-of-work の c6 非交差)
- TSD-3: テストは in-process seam(exported 純関数)を tests/unit に、実 FS を要する検証があれば tests/integration に置く(fs-tests-integration-first+E-SMF-ND 2軸追補 — in-process=計測軸 / 層=配置軸の区別)
- TSD-4: lint/型検査は既存 Biome+tsc strict の枠内(新規設定なし)

## 検証

- NFR-6(CI gate 維持)は**適用対象**: U1 はコードと並行テストを作成し typecheck/lint/complexity/drift/test/coverage(patch gate 含む)を green に保つ — TSD-1/TSD-4(既存 CI gate の継承・追加ツールチェーンなし)で充足する。N/A なのは「新規ツールチェーンの導入判断」のみ
