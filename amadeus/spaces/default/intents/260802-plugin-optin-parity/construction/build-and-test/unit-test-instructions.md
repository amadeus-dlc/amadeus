# Unit Test Instructions — plugin-optin-parity

対象は `code-generation-plan.md` のStep 2、6、7、8と、`code-summary.md` の共有readiness・doctor実績である。

## 対象と実行コマンド

```bash
bun test --timeout 120000 \
  tests/unit/t257-amadeus-config.test.ts \
  tests/unit/t306-plugin-host-class.test.ts \
  tests/unit/t313-doctor-plugin-section.test.ts \
  tests/unit/t325-face-disposition.test.ts \
  tests/unit/t326-adapter-compose-seam.test.ts \
  tests/unit/t415-formal-model-readiness.test.ts
```

project-only `plugins` schema、名前・重複・順序、doctor 6状態、7 face分類、OpenCode lifecycle seam、formal model readinessのzero/add/delete/invalid/past-successを検証する。

## 合格基準とテストデータ

- 全test・assertion成功、skip 0。
- table-driven fixtureで有効名・無効名・境界長・空集合・欠落assetを独立に構築する。
- test間でfilesystemや環境変数を共有しない。実filesystemを必要とするケースはintegrationへ置く。
- 各componentの正常系に加え、最低2つのerror/edge経路を検証する。

## Coverage期待値

新規・変更した分岐はcoverage registry/ratchetに登録し、既存閾値を低下させない。line coverageだけでなく、`not-selected` / `source-missing` / `not-installed` / `stale` / `current` / `failed` とreadiness 4値のbranch証跡を優先する。
