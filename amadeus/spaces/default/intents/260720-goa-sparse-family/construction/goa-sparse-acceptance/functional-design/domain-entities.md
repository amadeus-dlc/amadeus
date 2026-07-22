# Domain Entities — goa-sparse-acceptance

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## モデル境界

本 Unit は永続 entity や新サービスを導入しない。`unit-of-work.md` と `components.md` が指定する既存 TypeScript utility 内で、`requirements.md` の受理域を immutable な parse 結果として表す。`unit-of-work-story-map.md` の書き手/CLI/将来集計/CI は全て同じ値モデルを消費する。`component-methods.md` の additive shape と `services.md` の出力契約を越える aggregate/repository は作らない。

## 値オブジェクト

### GoaBreakdown

| 属性 | 型 | 不変条件 |
|---|---|---|
| `ok` | `true` | 成功判別子 |
| `ecode` | string | `E-` + 1個以上の大文字英数字 segment。複節は `-` で連結 |
| `votes` | 8要素 number tuple | 各値は非負整数。sparse では全 segment の bin別合計 |
| `segments` | optional `GoaSegment[]` | sparse 成功時だけ存在。canonical 成功時は absent |

### GoaSegment

| 属性 | 型 | 不変条件 |
|---|---|---|
| `label` | string | `/^[cC][1-9][0-9]*$/` に適合。入力表記を保存 |
| `votes` | 8要素 number tuple | 明示されない bin は0。明示 token は入力内で昇順・一意 |

`GoaSegment` は identity を持たない値オブジェクトである。同一レコード内の重複判定キーは label の ASCII 小文字化値である。segments 配列の順序は入力順で、将来の説明表示に使用できるが集計値の正しさは `votes` から得る。

### ParseFailure

| 属性 | 型 | 不変条件 |
|---|---|---|
| `ok` | `false` | 失敗判別子 |
| `error` | string | canonical 既存文言、または sparse 4クラスを識別する Q3 裁定済み文言 |

部分成功状態は表現しない。1セグメントでも不正なら `GoaBreakdown` を生成せず `ParseFailure` だけを返す。`ParseFailure` に `errorCode` は追加せず、`error` の stable prefix で4クラスを識別する。

### GoaLineCode

`GoaLineCode` は選挙 ID を保持する既存の parse 済み値である。自然形 regex は `^E-[A-Z0-9]+(-[A-Z0-9]+)*$`。複節自然形と旧圧縮形はどちらも同じ値として原文を保持し、正規化・圧縮・展開をしない。

## 関係と所有権

- `GoaBreakdown` 1件は1 `ecode` と0個または1個以上の `GoaSegment` を所有する。
- sparse の `votes` は owned segments から導出する。同じ count の独立コピーを別の source of truth にしない。
- `extractGoaRecords` は値を所有せず、corpus text からレコード候補を順序付きで返す scanner seam である。
- `GoaLineCode` と norm metrics の `ecode` は同じ lexical language を共有するが、別コンポーネントの既存値であり新しい共有 class へ統合しない。

## 状態遷移

parse は純粋で、ライフサイクル状態を保持しない。

1. Raw text → `extractGoaRecords` → ordered record strings。
2. Record string → head/body classification。最初の body token が有効 label の場合だけ sparse、それ以外は canonical 候補。
3. Canonical body → `GoaBreakdown(segments absent)`、または既存 `ParseFailure`。`2x...` の順序不正や `1xz...` の malformed token は従来文言を維持する。
4. Sparse body → 全セグメント検証 → `GoaBreakdown(segments present)`。後続 segment の label も同じ文法で検査し、いずれかの違反で `ParseFailure` へ直行する。
5. `ParseFailure` から成功値への自動回復、token skip、default label 補完はない。

レコード終端は次の `GoA[` または改行を外側境界とする。次の有効 head が終端理由の場合だけ、その直前のレコード間 `/` を除去する。改行・`)`・HTML comment 終端時の末尾 `/` は `sparse/empty-segment` 拒否のため温存する。最初の `)` 以降と HTML comment 以降は provenance suffix として除くが、scanner がそれ以前の不正 body を修復したり正当 prefix だけへ短縮したりしないことを受け入れ基準にする。

## テスト境界

GoaBreakdown、GoaSegment、ParseFailure、GoaLineCode の純粋な変換は、読み込み済み文字列 fixture を使う unit test で検証する。memory 層を発見して実ファイルを読む corpus sweep は integration test の責務とし、実 FS を unit test へ持ち込まない。ADR-3 の regex 受理域拡大は旧圧縮形・複節自然形・count 不変を独立 assert する。

## 非モデル化対象

- frontend/UI component: `services.md` が UI なしと確定しているため非該当。
- 永続化、repository、domain event: parse-only の純関数変更であり要求なし。
- election hold-resolution/rulingText: e2 #1267 の所有面で、関数単位非交差合意により本 Unit のモデル外。
- `renderGoaLine` canonical writer: 変更禁止。sparse は読み側互換であり新しい write entity を作らない。
