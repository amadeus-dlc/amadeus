# re-scan: 260710-codecov-project-gate

- base: none(本ブランチ `claude-engineer-2` の `re-scans/` は空 → 初回スキャン、差分ベースなし)
- observed: `98089faf175e1f39460821303d4682d8ab3cee06`(`git rev-parse HEAD` 実測)
- date: 2026-07-10
- scope: refactor(既存 CI カバレッジ経路への自前 project ゲート追加)
- prior codekb: 既存本文を prior として参照(配布/CI 構造は変化なし)

## スキャン焦点(#734 選挙 A)

既存 Coverage Report ジョブの lcov から総カバレッジ% を算出し、main ベースライン比で fail-closed 判定する自前 project ゲートを実装するための材料収集。詳細な発見は
`amadeus/spaces/default/intents/260710-codecov-project-gate/inception/reverse-engineering/developer-scan.md` を参照。

### 対象ファイル(実測)

- `.github/workflows/ci.yml`(coverage / codecov-status / ci-success ジョブ)
- `codecov.yml`(project/patch status、fixes、ignore)
- `tests/run-tests.ts`(coverage:ci、lcov 生成・正規化・総% 算出)
- `tests/gen-coverage-registry.ts`(ラチェット実装 — ベースライン運用の設計材料)
- `tests/.coverage-ratchet.json`(コミット済みベースラインの前例)
- `package.json`(coverage:ci スクリプト定義)
- PR #717(`fix/683-enable-codecov-project-wait`、park 中、本 intent が supersede 対象)
