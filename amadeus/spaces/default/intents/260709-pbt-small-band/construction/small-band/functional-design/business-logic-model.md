# Business Logic Model — 実装構成(Bolt 別)

## B1(基盤+semver/version-spec)
- ルート package.json devDependencies に fast-check 追加(単一 Bolt が所有 — B2/B3 は B1 マージ後 rebase、依存追加の重複コミット禁止)
- `tests/unit/setup-semver.pbt.test.ts`(新規、in-process Small): P-SV1〜SV4。生成器ヘルパー `tests/helpers/arbitraries/semver.ts`
- PBT 規約(シード・numRuns・ピン留めワークフロー)をテストファイル冒頭コメントに明文化(規約の canonical 定義)

## B2(manifest)
- `tests/unit/setup-manifest.pbt.test.ts`(新規): P-MF1/MF2。生成器 `tests/helpers/arbitraries/manifest.ts`

## B3(plan seam)
- `packages/setup/src/domain/plan.ts`: classify/classifyAction/toPlanAction に export 付与(挙動不変)
- `tests/unit/setup-plan-decisions.test.ts`(新規、in-process Small): P-PL1/PL2 + 代表 example
- 既存 FS ベース plan テストは無変更

## B4(audit-escape、コア波及)
- `packages/framework/core/tools/amadeus-audit.ts`: escapeAuditValue/unescapeAuditBody を抽出・export(呼び出し箇所 :295/:335 を置換、挙動不変)
- `tests/unit/t203-audit-escape.pbt.test.ts`(新規): P-AE1/AE2 + t111 既存アサーション維持確認
- dist 4ハーネス+self-install 同一コミット同期

## 実行順序と依存
B1 が fast-check 依存と生成器規約を確立 → B2/B3/B4 は B1 マージ後に rebase して着手(依存追加の衝突回避)。B2/B3/B4 相互は独立・並列可。coverage-registry の競合リスクは **B4 のみ**(amadeus-audit.ts は `audit` unitClass 対象。B1-B3 の packages/setup 配下は unitClasses 登録対象外 — レビューで実測確認済み)。B4 の registry 変更が他と並ぶ場合のみ integrity-batch のマージランブック(直列化+再生成)を適用。

## in-process 計測(NFR-2)
全 PBT/Small テストは対象を import して in-process 実行(Corrections: bun --coverage は spawn 非計測)。codecov/patch(新規行 100%)は in-process 実行で自然に満たす。
