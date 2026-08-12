上流入力(consumes 全数): code-generation-plan.md / code-summary.md

# Performance Test Instructions — 260811-allowlist-semantic-audit

## 判定: 専用の性能試験は生成しない(適用可能な NFR が存在しない)

Test Strategy は Comprehensive だが、ステージ契約の Step 4-8 は性能試験を
**「IF NFR performance requirements exist」**の条件付きとする。本 intent にその条件は成立しない。

`cid:build-and-test:c2-no-test-theatre-for-absent-nfr` に従い、体裁のために実体のない
ベンチマークを作らず、判定・根拠・将来この判定を覆す条件を明記する。

## 根拠(実測)

`requirements.md` の性能面は NFR-3 のみで、逐語は次のとおり:

> **NFR-3(実行時間)**: ガードは既存 patch gate と同じ CI ステップ内で完了する。
> 絶対値の閾値は観測データがないため置かない(`cid:code-generation:c1-threshold-inside-observed-range`)。
> 実測後に観測レンジの内側へ閾値を設けるかは別途判断する。

すなわち NFR-3 は**合否を決める数値目標を宣言していない**。閾値なきベンチマークは常に同じ判定を
返し、測定ではなくノイズになる(`org.md` Forbidden の検証劇場、および
`cid:code-generation:c1-threshold-inside-observed-range` — 閾値は観測レンジの内側に置く)。

## NFR-3 が実際に担保されている面

数値目標がないこととと無検証であることは別である。NFR-3 の「同一 CI ステップ内で完了する」は
構造で担保されており、別ジョブ・別ステップを追加していないことが検証になる:

- 宣言クラス検査は `tests/coverage-patch-gate.ts` の `runCheck` 内、allowlist 解決の直後にある
  (`code-summary.md` の「ガードの適用点」)
- CI へ新規ジョブ・新規ステップを追加していない(`evidence/ci-wiring.md`)
- 実測(`evidence/verification.md`): `bun tests/coverage-patch-gate.ts --check` = exit 0。
  ステップ自体のタイムアウト超過は起きていない

## この判定を覆すべき条件

次のいずれかが成立したら、性能試験の要否を再判定する。

1. `selector.class` の宣言数がラチェットで増え、AST 解析の対象範囲が現行(宣言 4 件)から
   桁で増えたとき — 全 616 件が宣言を持つ状態は現行の 150 倍超の解析量になる
2. NFR-3 が観測レンジの内側に絶対値の閾値を持つよう改訂されたとき
3. `coverage-head` ジョブがタイムアウトで落ちる実測が出たとき
