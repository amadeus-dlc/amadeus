# Code Generation Plan — fix-1080-diary-ensure-exists

## 上流入力(consumes 全数)

requirements.md(FR-1〜5、裁定留保3点焼き込み済み)、RE scan-notes(choke point 接地・5経路列挙)、Issue #1080。

## 変更目録(全数、正本のみ列挙 — dist/self-install は再生成)

| # | ファイル | 変更 |
|---|---------|------|
| 1 | `packages/framework/core/tools/amadeus-lib.ts` | `ensureStageDiary()` 追加(recordDir 直後、モジュールスコープコメント+3値 return) |
| 2 | `packages/framework/core/tools/amadeus-orchestrate.ts` | import 追加+`buildRunStageDirective` 内で `recordPrefix !== null && codekbCtx` ガード付き呼び出し1行 |
| 3 | `packages/framework/core/amadeus-common/conductor.md` | 「Keeping the diary」手順1を engine 生成+fallback copy へ更新 |
| 4 | `tests/unit/t-ensure-stage-diary.test.ts` | 新設(4テスト: created / never-overwrite / template-missing / idempotent。in-process、dist/claude lib import) |
| 5 | `tests/.coverage-registry.json` | gen-coverage-registry.ts 再生成(新テストファイル追加に伴う) |

正本4+registry 1 = 計5ファイル(列挙から機械再計算)。dist×6+self-install×2 は package.ts / promote:self で再生成。

## 設計判断(要件からの導出)

- 挿入点 = `buildRunStageDirective` 内(AC-1c の単一チョークポイント — 全5呼び出し元が codekbCtx を渡すことを実測済み)。`recordPrefix === null`(pre-birth shell)はガードで除外 — intent dir 不在時の bogus mkdir を防ぐ
- テンプレート解決 = `harnessDir()`(deriveHarnessDir 系、AMADEUS_HARNESS_DIR env seam でテスト可能)+ 固定 `knowledge/amadeus-shared/memory-template.md`(AC-1b — memoryTemplatesDir は不使用)
- helper は amadeus-lib.ts(既計測モジュール)に配置し export — AC-2c の in-process seam(seam-placement-measured-module)

## 落ちる実証の計画(AC-2b)

dist 側 lib の `existsSync(abs)` 早期 return を `false &&` 注入 → never-overwrite/idempotent の2テストが FAIL することを確認 → regen で復元 → 4 pass(実施済み、code-summary に記録)。

## 検証計画

typecheck / lint / dist:check / promote:self:check / gen-coverage-registry(再生成後 green)/ smoke / 新テスト4 / ローカル lcov(新規行 DA>0、配線行含む)/ AC-4d dogfooding(本 intent の次ステージ next で diary 自動生成を実測)。
