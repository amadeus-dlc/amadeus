# Component Methods — 制御バイト検出ゲート(Issue #2814)

上流入力(consumes 全数): requirements.md(受け入れ基準を各メソッド契約へ転写)、architecture.md(Bun 標準 API のみという依存制約 — NFR-4)、component-inventory.md(unchecked-cast-guard の `--check` verb・SCAN_ROOTS 定数様式を署名の先例に使用)

## tests/lib/control-byte.ts(純関数層)

```ts
/** 検出対象バイトか(C0 − {TAB,LF,CR} + DEL — AD Q3 裁定 cr-excluded)。 */
export function isForbiddenControlByte(byte: number): boolean;

/** 最初の違反バイトを返す。違反なしは null。offset は 0 起点のバイト位置。 */
export function findControlByte(buffer: Uint8Array): { offset: number; byte: number } | null;
```

- 入出力: バイト列 → 判定結果のみ。FS・process・env 非依存(決定性 NFR-1 の基盤)。
- エラー処理: 純関数のため例外経路なし(空バッファは null)。
- 導出コメント(FR-CBG-11): `isUtf8`(amadeus-migrate.ts:477 — バイト直接判定)と `CONTROL_CHARS`(amadeus-lib.ts:4298 — バイト集合)への参照、および CR 除外の意図的相違(decisions.md ADR-3)をコード内コメントで明文化。

## tests/control-byte-gate.ts(CLI)

```ts
/** allowlist エントリ(AD Q2 裁定 in-script)。 */
type AllowlistEntry = { readonly path: string; readonly reason: string };
const BINARY_ALLOWLIST: readonly AllowlistEntry[];  // 初期1件: assets/AI-DLC-Workflows-2.0-Specification.pdf

// components.md の「CONTROL_BYTE_SET 相当の集合定義」は isForbiddenControlByte 述語がその集合の
// 特性関数として担う — enumerable な集合定数は設けない(述語1定義が canonical)。

/** in-process seam(FR-CBG-12・coverage 対策): 走査本体を export。 */
export function runControlByteGate(opts: { repoRoot: string; listFiles?: () => string[] }): GateResult;

type GateResult = {
  readonly scannedCount: number;
  readonly violations: readonly { path: string; offset: number; byte: number }[];
  readonly staleAllowlist: readonly string[];
  readonly readErrors: readonly { path: string; message: string }[];
};
```

- `--check` verb: `runControlByteGate` を実行し、violations / staleAllowlist / readErrors のいずれか非空で exit 1、全て空で exit 0(FR-CBG-1、NFR-3)。
- 診断出力(FR-CBG-6): 1違反 = 1行 `<path>: control byte 0x<HEX> at offset <decimal>`。全件列挙(NFR-2 — 打ち切りなし)。
- 列挙: `git ls-files -z` を spawn し NUL 区切りでパース(FR-CBG-2 — 日本語パスのバイト安全)。`listFiles` 注入は in-process テスト用 seam(テストダブル分岐を本番へ置かない — port 注入)。
- 読取: `readFileSync`(Buffer)→ predicate。外部 grep 呼び出しゼロ(FR-CBG-13)。
- allowlist 適用: path 完全一致で skip。エントリが `git ls-files` 出力に不在なら staleAllowlist へ(fail-closed — FR-CBG-5)。

## CI ジョブ(.github/workflows/ci.yml)

```yaml
control-byte-gate:            # 常時実行 — needs.changes 条件なし(AD Q1 裁定)
  steps: checkout → setup bun → timeout 30s bun tests/control-byte-gate.ts --check
```

- timeout は no-silent-drop step(ci.yml:157 `timeout --signal=TERM --kill-after=5s 30s ...`)の既存値 30s を再利用する — 逐語引用は数値 30 であり、`--signal=TERM --kill-after=5s` を含むコマンド形全体も実装時に同形へ揃える(FR-CBG-14、新規マジックナンバー禁止)。
