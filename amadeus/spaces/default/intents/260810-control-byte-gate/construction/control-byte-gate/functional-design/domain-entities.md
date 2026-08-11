# Domain Entities — control-byte-gate(Issue #2814)

上流入力(consumes 全数): requirements.md(受け入れ基準 → 型の不変条件)、unit-of-work.md(エンティティの所在 = U1 ファイル群)、unit-of-work-story-map.md(診断行 = コミッター向け値オブジェクト)、components.md(型の所有コンポーネント)、component-methods.md(署名の正本 — 本書は型の意味を精緻化)、services.md(GateResult → exit の写像)

## 型定義(tests/lib/control-byte.ts + tests/control-byte-gate.ts)

```ts
/** 違反の所在。offset は 0 起点のバイト位置、byte は 0-255。 */
type Violation = { readonly path: string; readonly offset: number; readonly byte: number };

/** allowlist エントリ。reason は空文字列不可(実装で assert)。 */
type AllowlistEntry = { readonly path: string; readonly reason: string };

/** 走査結果 — 3 つの失敗集合と走査件数。すべて空 = green が唯一の成功状態。 */
type GateResult = {
  readonly scannedCount: number;
  readonly violations: readonly Violation[];
  readonly staleAllowlist: readonly string[];
  readonly readErrors: readonly { readonly path: string; readonly message: string }[];
};
```

## 不変条件

- `scannedCount` = 列挙件数 − allowlist 命中件数(readErrors のファイルも「走査を試みた」として scannedCount に含む — 定義を実装コメントに固定)。
- `Violation.offset` は該当ファイル内で**最初の**違反バイト位置(1 ファイル 1 エントリ — 全違反バイトの列挙はしない。ファイル単位の名指しで修正には十分、NFR-2 の「該当ファイル全件列挙」はファイル粒度)。
- GateResult は判別 union ではなく積型 — 「成功」は3集合の空で表現し、成功フラグのフィールドは持たない(検証劇場 Forbidden: どのコードも消費しないフィールドを置かない。exit code は3集合から毎回導出)。
- 型はすべて readonly(functional-domain-modeling-ts の不変スタイル)。class は使わない。

## UI/フロントエンド

該当なし(frontend-components.md は produces から prune 済み — UI 非該当 Unit)。
