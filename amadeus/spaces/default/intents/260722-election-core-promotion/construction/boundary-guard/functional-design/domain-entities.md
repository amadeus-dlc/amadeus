# Domain Entities — U1 boundary-guard

> 上流入力(consumes 全数): components(C1)、component-methods(C1 の Finding 型)、requirements(FR-5)、unit-of-work(U1)、unit-of-work-story-map、services(該当なし)

## 型(functional-domain-modeling-ts スタイル — 判別 union、brand 不要の小型域)

| 型 | 形 | 備考 |
|---|---|---|
| ScanRoot | `{ kind: "packages" \| "dist" \| "self-install"; dir: string }` | roots は canonical 定数1箇所(BR-7) |
| AllowRule | `{ id: string; fileGlob: string; pattern: RegExp }`+companion `AllowRule.parse(raw): Result<AllowRule, ParseError>`(id 非空・pattern コンパイル可能性を強制するスマートコンストラクタ — FDM-TS スタイル) | id 必須(BR-2 の「型で強制」は parse 関数経由で充足)。RegExp は固定様式の短トークン照合(regex-linearity 義務化対象外だが線形設計) |
| Finding | `{ file: string; line: number; excerpt: string }` | 述語1の出力(component-methods C1 と同形) |
| DuplicateFinding | `string`(basename) | 述語2の出力 |

## 不変条件

- Finding.line は 1-origin、excerpt は当該行の trim 済み断片(80 文字上限 — ログ肥大防止)
- 述語は純関数(FS・プロセス・環境変数へ触れない)— テストダブルは入力データで表現(construction 原則: テスト専用分岐を本番コードに置かない)

## frontend-components について

UI なしの CLI/テスト Unit のため frontend-components.md は生成しない(optional_produces の CONDITIONAL 非該当 — 生成後の produces-ls-check で不在を確認する)
