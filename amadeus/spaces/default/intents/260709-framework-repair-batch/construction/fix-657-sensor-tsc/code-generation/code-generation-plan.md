# Code Generation Plan — fix-657-sensor-tsc

> Bolt: `fix-657-sensor-tsc` / Issue: [#657](https://github.com/amadeus-dlc/amadeus/issues/657) / 要件: FR-657(requirements.md)
> 対象正本: `packages/framework/core/tools/amadeus-sensor-type-check.ts`。複製先(`.claude/tools/`・`.codex/tools/`・`dist/*/tools/`)は生成・昇格で同期(NFR-1)。

## 設計方針(実測済みコードに基づく)

現状センサーは起動時プローブ(`spawnSync("bunx", ["tsc", "--version"])`、L157)と本実行(`bunx tsc --project ...`、L173-174)の両方で bunx 解決の tsc を使う。bunx が repo ピン(typescript ^6.0.3)と異なる TS(観測: 7.0.2)を解決すると、TS18003 + `--incremental` の exit code が 2→1 にドリフトし `tests/integration/t92.test.ts` Group N test 44 が誤赤になる。修理は:

- tsc ランチャー解決を一元化する: プロジェクトの `node_modules/.bin/tsc`(Windows は `tsc.cmd`/`tsc.exe` を考慮)が存在すればそれを優先起動し、存在しない場合のみ従来の `bunx tsc` にフォールバックする。プローブと本実行の両方が同一の解決結果を使う(プローブだけローカル・本実行だけ bunx のような分裂を作らない)
- `t92.test.ts` の期待値(exit 2)は変更しない(Q3=A)

## Steps

- [ ] Step 1: 回帰テスト(赤)を先に用意 — t92 Group N test 44 の TS18003 fixture を用い、「bunx が TS 7.x を解決する環境」を模す再現手順で修正前に exit 1 ドリフトが起きること(= test 44 が赤)を実測記録する。CI 環境で直接再現できない場合は、ランチャー解決関数を切り出した単体テスト(node_modules/.bin/tsc 実在時にローカルパスを返し、不在時に bunx へフォールバックする)を新設し、その単体テストが修正前に赤(関数不在)であることをもって NFR-4 を満たす
- [ ] Step 2: `packages/framework/core/tools/amadeus-sensor-type-check.ts` にランチャー解決を実装(ローカル `.bin/tsc` 優先 → bunx フォールバック)。プローブ(L152-)と本実行(L173-)を解決結果に統一
- [ ] Step 3: `bun scripts/package.ts` で dist 再生成、`bun run promote:self` でセルフインストール昇格。`git diff` で `.claude/`・`.codex/`・`dist/*` の4複製先に同一修正が反映されたことを確認(FR-657 合否基準(c))
- [ ] Step 4: `bash tests/run-tests.sh --ci` で t92 を含むスイート全体の緑を実測(repo ピン TS 6.0.3 で test 44 が決定的に exit 2 = 緑)
- [ ] Step 5: 検証コマンド一式: `bun run typecheck` / `bun run lint` / `bun run dist:check` / `bun run promote:self:check`

## 制約

- センサーは self-contained(sibling tools から import しない — ファイル先頭コメントの既存制約)を維持する
- 互換シム禁止(NFR-3): bunx フォールバックは「ローカル tsc 不在」の正当な環境差分岐であり、旧挙動温存シムではない(FR-657 が明示要求)
- 正本→生成物の同期を同一コミットに含める(NFR-1)
