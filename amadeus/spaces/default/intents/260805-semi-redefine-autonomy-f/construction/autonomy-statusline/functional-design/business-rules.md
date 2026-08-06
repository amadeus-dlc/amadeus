# Business Rules — `autonomy-statusline`(#2253)

上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

依拠箇所: `requirements.md` FR-DISP-1(語彙規則の出所)、`components.md` ADR-10(情報源規則の裁定)、`component-methods.md` §C14(出力表と幅規則)、`services.md` P5 / S10(実行コスト制約)、`unit-of-work.md` §`autonomy-statusline` 実装上の制約(表示専用語彙の禁止)、`unit-of-work-story-map.md` §ゴールの割当 横断行(`--status` との同一語彙)。

---

## 決定規則と不変条件

| # | 規則 | 出所 |
| --- | --- | --- |
| R1 | **語彙同一**: 表示する mode 名は `--status` の `Autonomy:` 行(`amadeus-utility.ts:341` verbatim `` `Autonomy:       ${autonomy.autonomyMode}`, ``)と同一の `none` / `semi` / `full` とする。表示専用語彙(略語・大文字化・記号置換)を作らない | FR-DISP-1 受け入れ基準 / `unit-of-work.md` 実装上の制約 / story-map 横断ゴール「表示の同一語彙」 |
| R2 | **情報源は state のみ**: `Intent Autonomy Mode` フィールドを state ファイル文字列から読む。audit projection(監査シャードの replay)を読まない。state と projection の乖離時は state 側を表示し、canonical を見たいときは `--status`(C15)という役割分担とする | ADR-10 Decision / Consequences |
| R3 | **追加 I/O ゼロ**: `main()` が既に読んでいる state 文字列からの抽出のみ。新しい read・spawn・network を発生させない | `services.md` P5(毎プロンプト起動)/ §性能表「P5 の追加コスト: ゼロ」 |
| R4 | **不正値は沈黙縮退**: フィールド不在または 3 値以外は空文字を返し、セグメントを足さない。警告記号・エラー表示を出さない(第2の表示語彙の禁止 — ADR-10 Option C の却下理由) | `component-methods.md` §C14 出力表 / ADR-10 Alternatives Rejected |
| R5 | **幅規則を新設しない**: セグメントは固定 5〜6 文字(` @none` / ` @semi` / ` @full`)であり、幅制約下の省略は既存 `printLine` の右寄せ処理に委ねる | `component-methods.md` §C14(OQ-5 の閉じ方) |
| R6 | **経路限定**: セグメントは active-workflow の `output` 連結にのみ付く。ready 行(state 不在 / phase 不在)と COMPLETE 行には付かない | `functional-design-questions.md` D3(構造的一意) |
| R7 | **値域は canonical 導出**: 判定に使う 3 値集合は `AutonomyMode` 型(`amadeus-intent-autonomy.ts:9`)へ型注釈でピンした literal 配列とし、自由な文字列比較の複製を作らない | phases/construction.md「canonical な 1 定義から導出」/ D2 |

## バリデーション論理

入力検証は「集合帰属」の 1 判定に閉じる:

```
mode ∈ {"none", "semi", "full"}  →  表示
それ以外(undefined / "" / 未知値 / 大文字違い)  →  非表示(空文字)
```

- `trim()` 後に判定する(state の手書き編集で末尾空白が混入しても正しく判定される — `amadeus-stop.ts:163` の既存読み手と同じ寛容)。
- 大文字小文字は区別する。state の書き手(`amadeus-utility.ts:4635` の birth 初期値と `set-autonomy` の書込み)は小文字 3 値のみを書くため、大文字値の受理は不正状態の隠蔽になる(fail-quiet だが fail-open にはしない — 表示しないだけで、誤った語彙を表示することはない)。

## テスト固定(FR-DISP-1 の受け入れ基準)

| ケース | 入力(state 断片) | 期待(`autonomySegment` 返り値) | 連結後の表示 |
| --- | --- | --- | --- |
| T1 | `- **Intent Autonomy Mode**: none` | `"none"` | ` @none` |
| T2 | `- **Intent Autonomy Mode**: semi` | `"semi"` | ` @semi` |
| T3 | `- **Intent Autonomy Mode**: full` | `"full"` | ` @full` |
| T4 | フィールド行なし | `""` | (セグメントなし) |
| T5 | `- **Intent Autonomy Mode**: FULL`(不正値の代表) | `""` | (セグメントなし) |

返り値ドメインは C14 シグネチャのコメント逐語 `// "" | "semi" | "full" | "none"` に一致する。T1〜T3 が FR-DISP-1 の受け入れ基準(3 mode それぞれで対応語彙)を直接充足する(表示形への合成は C14 verbatim の呼び出し側連結 `if (autonomy) output += ` @${autonomy}`;` が決定的に行う)。T4/T5 は R4 の縮退規則を固定する(エラー/エッジの 2 ケース以上 — phases/construction.md Testing Standards)。テストは t448(`unit-of-work.md` §テスト番号の予約)。

## 本 Unit が守らない(守る必要がない)規則の明示

- **fail-closed 系 NFR(NFR-1 の落ちる実証)**: 本 Unit は認可・受理ゲートを新設・改訂しない(表示のみ)ため、NFR-1 の対象 5 ゲート(story-map §NFR の割当)に含まれない。
- **AUTO_DECIDED 記録系(NFR-2)**: 本 Unit は裁定を行わず記録も書かない。
- 上記 2 点は「省略」ではなく story-map の割当表で本 Unit に割り当てられていないことの確認である(検収 Unit は他 Unit)。
