# Tech Stack Decisions — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../functional-design/business-logic-model.md`、`../functional-design/business-rules.md`、`../../../inception/requirements-analysis/requirements.md`、codekb technology-stack.md。

## 決定(すべて project.md 既決の継承 — 新規決定なし)

| 面 | 決定 | 出所 |
|---|---|---|
| ランタイム | Bun(TypeScript / ESM)— runtime dependency 追加禁止 | project.md Tech Stack+Forbidden |
| 型検査 / lint | `tsc --noEmit` / Biome(フォーマッタ無効) | project.md |
| テスト | bun test ベース `tests/run-tests.sh`(unit / integration 層に配置、サイズ純度 C-2) | project.md Testing Posture |
| ドメイン様式 | functional-domain-modeling-ts(brand 型+コンパニオン — 既存 harness.ts 様式の保存) | project.md DECIDED |
| 配布 | dist 6ツリー+self-install 2ツリー regen(package.ts / promote:self) | project.md Mandated |

## 新規導入

なし — ライブラリ・ツール・パターンの新規導入ゼロ(reuse inventory = unit-of-work.md)。
