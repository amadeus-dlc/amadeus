# Unit Test Instructions — 260810-control-byte-gate

上流入力(consumes 全数): code-generation-plan.md(Step 1・Step 4 の述語層とテスト層の分離方針 — 本書の対象範囲の導出元)、code-summary.md(BR-2 の境界値 12 点と検出集合の逐条監査 — 本書のケース一覧の照合軸)。

戦略: **Comprehensive**。ただし件数の上限(15/コンポーネント)は計画上の天井であって割当ではない — 本 Unit の unit 層は純関数1本しか持たないため、要件・リスク・NFR から導かれるケースのみを置く。

## 対象

`tests/unit/t-control-byte-predicate.test.ts` — `tests/lib/control-byte.ts` の純関数層(`isForbiddenControlByte` / `findControlByte`)。

実 FS・process・env に触れないことがこの層の定義であり、実 FS を使う検証は integration 層に置く(`cid:code-generation:fs-tests-integration-first`)。

## 実行

```
bun test tests/unit/t-control-byte-predicate.test.ts
```

## カバーする範囲

- **検出集合の境界値**(BR-2 / FR-CBG-3): 0x00 / 0x08 / 0x09 / 0x0A / 0x0B / 0x0C / 0x0D / 0x0E / 0x1F / 0x20 / 0x7F / 0x80 の 12 点。TAB・LF・CR の除外と DEL の包含が、境界の両側で固定される。
- **空バッファ**: 違反なしを返す(打ち切りや例外にしない)。
- **エスケープ表記の非検出**(FR-CBG-4): `"\\x00"` のような表記は判定対象の形をとらない。この性質があるからこそ、ゲート自身のソースが検出集合を逐語で語りながら green でいられる。

## 生バイトの扱い

**制御バイトは実行時生成する**(`Buffer.from([...])`)。生バイトを含む fixture をツリーへ置くと、リポジトリが自身のゲートで赤くなる。恒久 fixture 禁止は Q3 裁定 temp-commit として要件段で確定している。

## カバレッジ

述語層は CLI から in-process import されるため、spawn 盲点(`bun --coverage` が子プロセスを計測しない)に落ちない。個別の下限は置かず、リポジトリ共通の Project / Patch Coverage Gate で判定する。
