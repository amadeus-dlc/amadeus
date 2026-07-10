# Re-scan 記録 — 260709-pbt-small-band

> #707 新契約(per-intent re-scan 記録)の初運用レコード。`codekb/amadeus/re-scans/` の初レコード。
> 差分ベース点の真実源はこのファイル(この intent 固有)。共有 `reverse-engineering-timestamp.md` は鮮度ポインタであってベース点ではない。

## スキャンメタデータ

- **base**: `none`
  - 理由: `codekb/amadeus/re-scans/` は本スキャン前に不在(Developer スキャンが `ls` で確認)。他 intent にも re-scan 記録が皆無のため、新契約の「re-scan 記録が全く存在しないときは `none`(初回フルスキャン相当)」に該当。
- **observed**: `9a2f5c7205795a255f258628710820def2ab3f8c`
  - `git rev-parse HEAD` 実測(Developer スキャン・Architect 合成の双方で確認)。
- **date**: 2026-07-09
- **intent**: `260709-pbt-small-band`(#697 / #684 Phase B、PBT × Small band 育成)
- **手法**: prior codekb 本文(observed `162553b99` 時点の `codekb/amadeus/`)を prior として利用し、焦点領域は実コード直読で確認。

## focus(スキャンスコープ)

- `packages/setup/src/domain/{semver,version-spec,manifest,plan}.ts` — ドメイン型 seam(class-free / type+コンパニオン namespace / ブランド型 / 判別ユニオン Result)
- `packages/setup/src/internal/semver-factory.ts` — 比較律の実体
- `tests/unit/{setup-semver,setup-manifest,setup-plan}.test.ts` — setup ユニットテストと in-process 化の距離
- `tests/lib/test-size.ts` / `tests/run-tests.ts`(`printSizeMatrix`) — #700 size 分類器・レポート
- `tests/unit/t-test-size-drift.test.ts` — size ドリフトガード契約
- `tests/unit/t111.test.ts:227-270` / `packages/framework/core/tools/amadeus-audit.ts:295` — 監査エスケープ不変条件
- `package.json`(`devDependencies` / `lint` / `typecheck` / `--release` 層) — fast-check 導入面

## 差分の焦点影響(`162553b99..HEAD`)

- `git diff --name-status 162553b99..HEAD` で4修正相当を確認。**焦点領域(`packages/setup/**`、`tests/unit/setup-*`、`tests/lib/test-size.ts`、`amadeus-audit.ts`)への変更はゼロ**。
- 差分は framework 側に限局(reverse-engineering.md ステージ・mint-presence フック・re-artifacts ナレッジ・amadeus-lib/utility・CI・release-sync・codecov.yml・新テスト t203/t-release-sync 系)。
- 結論: 焦点領域は prior codekb がそのまま有効。本スキャンは実コード直読で足りる。
