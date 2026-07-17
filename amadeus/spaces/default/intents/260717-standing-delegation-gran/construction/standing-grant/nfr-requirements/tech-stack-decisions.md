# Tech Stack Decisions — standing-grant(U1)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`(純関数構成・エラー処理方針)、`../functional-design/business-rules.md`(R-1〜R-8)、`../../../inception/requirements-analysis/requirements.md`(FR-1〜8)、codekb `technology-stack.md`(Bun/TS/Biome — 本日 RE 現況)

## 決定

- 追加依存ゼロ(Forbidden 遵守)— node:fs / node:path / 既存 amadeus-lib のみ(前例 = #922 intent の nfr-design/security-design.md「攻撃面増加ゼロを import 面(node:fs/node:path/amadeus-lib のみ)で構造保証」— record 260716-answer-preemption-guard/construction/answer-evidence-sensor/nfr-design/security-design.md の実文)
- TypeScript/ESM+Bun 直実行、lint=Biome・型検査=tsc(codekb technology-stack の現況どおり)
- テストは tests/integration 層(実 FS fixture を使うため unit 層へ置かない — team.md cid:code-generation:fs-tests-integration-first。origin/main 着地済み(norm PR #1120、E-MTR-CG C2)で本ブランチ未取込のため tree 内 grep は 0 になる点を注記)
- 定数: DEFAULT_STANDING_GRANT_TTL_MS(named const・env override なし — ADR-4 の意図的相違明文)

## 変更なしの確認

新規パッケージ・ビルド設定・CI 面の変更なし(既存検証列のみ)— 新設パッケージ時の lint/型検査配線規律(project.md affirmed 2026-07-08)は対象外であることを明記。
