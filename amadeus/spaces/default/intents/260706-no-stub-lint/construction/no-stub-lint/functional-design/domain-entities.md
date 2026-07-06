# Domain Entities — no-stub-lint

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 検出器（6 カテゴリ）

| カテゴリ ID | 対象 | 検出パターン（実装形は code-generation で確定） | 出典 |
|---|---|---|---|
| compat-symbol | 宣言シンボル名 | `(function|const|let|class|interface|type|enum)` 直後の識別子が `/(legacy|shim|compat|deprecated)/i` を含む | FR-1.2(a) |
| compat-alias | export alias | `export { X as Y }` 形式で X ≠ Y の旧名 re-export | FR-1.2(b) |
| compat-comment | コメント・文字列 | keyword「後方互換」の出現（この 1 語のみ。英語系の語は対象外） | FR-1.2(c) |
| stub-throw | throw 文 | `not implemented` 系メッセージの throw | FR-1.3(a) |
| stub-empty-todo | 関数本体 | 本体が空（文を 1 つも含まない）の関数・メソッドで、本体内または宣言直前 3 行以内のコメントに TODO / FIXME を含むもの（併存の判定範囲をこの 2 箇所に限定） | FR-1.3(b) |
| stub-always-pass | テスト assertion | `assert(true)` / `expect(true).toBe(true)` 型の常時成功 | FR-1.3(c) |

## 許可リストエントリ（実体）

| フィールド | 意味 | 必須 |
|---|---|---|
| 対象（glob） | finding の path と照合する glob（brace 展開で二重コピーを 1 行化） | 必須 |
| カテゴリ | 上表のカテゴリ ID（`*` は不可 = カテゴリごとに明示宣言） | 必須 |
| 維持理由 | なぜ許容するか | 必須（空は無効） |
| 終了条件 | いつ削除・見直すか | 必須（空は無効） |

## 棚卸し 23 件の宣言計画（FR-3.2）

| 対象 glob（案） | カテゴリ | 件数 | 正当性 |
|---|---|---|---|
| `{skills,.agents/skills}/amadeus-validator/validator/AmadeusValidator.ts` | compat-symbol | 6 | 宣言済み旧形式 record 3 件の互換検査実装（legacy / legacyFiles / legacyDirectories） |
| `{skills,.agents/skills}/amadeus-validator/validator/*.ts` | compat-comment | 10 | 同上 + registry status 互換許容（#455）の説明コメント |
| `dev-scripts/evals/{amadeus-templates,amadeus-validator}/check.ts` | compat-symbol | 3 | 宣言済み互換対象を検査する eval fixture |
| `dev-scripts/evals/{doctor-drops,engine-gap-trio,amadeus-validator}/check.ts` | compat-comment | 4 | 宣言済み互換挙動の検査説明 |

いずれも docs/backward-compatibility.md 既存台帳（旧形式 record 3 件）と Issue #455 に由来する宣言済み互換対象であり、新規混入ではない。glob・件数の最終確定は code-generation の実測（FR-3.3、A-2）で行う。
