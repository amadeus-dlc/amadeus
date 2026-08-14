# Business Rules — plugin-settings-core

上流入力: `business-logic-model.md`、`requirements.md` FR-SET-1〜5 / NFR-2 / NFR-3、`decisions.md` ADR-3/ADR-6、`unit-of-work.md` U2 制約、`components.md` C2〜C4、`component-methods.md` C2〜C4 契約、`services.md` F2。

## 検証規則(fail-closed の閉語彙)

| # | 規則 | 発火点 | 効果 |
|---|---|---|---|
| R1 | settings キー名は `^[a-z][a-z0-9-]*$`・64 文字以内 | 宣言 parse / config parse | 違反 = manifest 無効 / config invalid |
| R2 | 機密パターンキー(token/password/secret/credential/apikey/api-key を含む)は拒否 | 宣言 parse / config parse | 同上(FR-SET-3、NFR-2 — 機密の置き場を字句レベルで塞ぐ) |
| R3 | type は {string, number, boolean, enum} の閉語彙 | 宣言 parse | 違反 = manifest 無効 |
| R4 | default は type と整合(enum は values 内) | 宣言 parse | 違反 = manifest 無効 |
| R5 | override 値はスカラーのみ(null・配列・オブジェクト拒否) | config parse | 違反 = config invalid(部分適用なし) |
| R6 | 宣言に無いキーの override は拒否 | 解決時 | センサー実行中止 + loud 記録 |
| R7 | override の型・閉語彙は宣言と突合 | 解決時 | 同上 |
| R8 | **省略のみ**がデフォルト適用(不在 ≠ 不正) | 全点 | 省略 → 宣言 default。書き損じ → fail-closed(既存ノルム「省略と不正値の区別」) |
| R9 | `settings` の綴り誤り(既知キー集合外かつ編集距離 ≤ 2)は loud | 宣言 parse | manifest 無効(FR-SET-4) |
| R10 | 既知キー集合に `advisories` を含める(別パーサ所有) | 宣言 parse | 既存 formal-model-check manifest を壊さない(非退行) |
| R11 | 既存の未知 config パス検出(`appendUnknownPathIssue`)の閉性を緩めない | config parse | registry 追加による自動追随のみ。手書きの許容分岐禁止 |
| R12 | env 宣言スキーマは実装しない(先送り — ADR-3 Decision 4) | — | 本 Unit のコードに env 宣言の parse・型・検証を一切置かない(先行着地禁止) |

## ビジネス不変量

- I1: settings 未宣言プラグインの挙動は byte/挙動とも不変(旧 manifest byte-identical、spawn 引数不変)。
- I2: 解決結果は宣言 default を基底に project → space → intent の後勝ち — 同一入力に対し決定的。
- I3: 検証エラーの文言は「何が・どこで・期待は何か」を含む(既存 config issue の `expected` 様式に合わせる)。
- I4: 後方互換レイヤー・移行シムなし(NFR-3)— 新機構は optional 宣言の自然な不在で共存し、フォールバック分岐を持たない。

## エラー分類(回復可能性)

- manifest 無効 / config invalid → 致命(fail-fast: compose 失敗 / config 全体 invalid — 既存機構の分類に従う)
- 解決 SettingsError → 当該センサー実行の中止(回復可能: 設定修正で次回発火から回復)。ワークフローは止めない(センサーは advisory)
