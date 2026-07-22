# Business Rules — goa-sparse-acceptance

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## 追跡可能なルール

`unit-of-work.md` の完了条件、`unit-of-work-story-map.md` の4ジャーニー、`requirements.md` の FR-1〜FR-4、`components.md` の変更/非変更面、`component-methods.md` の関数契約、`services.md` の4出力契約を次のルールへ写像する。

| ID | ルール | 根拠 |
|---|---|---|
| BR-1 | canonical 8-bin 行は現行挙動を完全に維持し、`segments` を返さない | FR-1、ADR-1 |
| BR-2 | sparse 行は1個以上のセグメントを持ち、各セグメントは有効ラベルと1個以上の vote token を持つ | FR-1(iii)、ADR-2 |
| BR-3 | 欠落 bin は0。行全体の votes はセグメント別 votes の bin ごとの合計 | ADR-1、component-methods.md |
| BR-4 | 1件でも不正ならレコード全体を拒否し、正当部分だけを返さない | e2 留保、ADR-2 |
| BR-5 | 同一物理行の複数 `GoA[...]` occurrence を独立レコードとして全て抽出する | FR-1 AC(i)、ADR-4 |
| BR-6 | sparse label は `/^[cC][1-9][0-9]*$/`。表記は保存し、ASCII case-fold 後が同じ label は重複とする | E-GSFFD1、requirements.md FR-1(iii) |
| BR-7 | 抽出終端は次の head/改行と既知 provenance 境界だけで閉じ、不正 body を抽出処理で無音除去しない。末尾 `/` の除去は次の有効 head 直前のレコード間区切りに限定する | E-GSFFD2、ADR-4、corpus sweep 両側実証 |
| BR-8 | sparse 拒否理由は型不変の stable prefix + 詳細で4クラスを判別可能にする | E-GSFFD3、services.md 出力契約1 |
| BR-9 | `GoaLineCode` は複節自然形と旧圧縮形をともに受理し、入力値を変換しない | FR-2、ADR-3、E-GSFRA2 |
| BR-10 | `ECODE_RE` の変更は全長 match 化だけで、occurrence count を変えない | FR-3、ADR-3 |
| BR-11 | `renderGoaLine`、check/distill、store/timeline、e2 #1267 の hold-resolution/rulingText 面を変更しない | components.md 非変更、交差合意 |
| BR-12 | core 正本の変更は dist 6面+self-install へ生成し、scripts 2面は配布しない | FR-4、architecture 層分離 |

## Sparse 文法

レコードは `GoA[E-code]: <body>`。body の最初の token が有効 label に一致するときだけ sparse、その他は canonical 候補とする。これにより `2x...` や `1xz...` で始まる既存の不正 canonical 入力は従来の経路・文言を維持する。sparse body は `/` 区切りの1個以上のセグメントで、基本形は `<label> <bin>x<count> [<bin>x<count> ...]` とする。

- `<label>`: `/^[cC][1-9][0-9]*$/`。入力表記を保存する。
- `<bin>`: 1〜8。セグメント内で厳密昇順かつ一意。
- `<count>`: 既存 `GOA_TOKEN_RE` と同じ10進非負整数。
- `/`: セグメント区切り。前後空白を許すが、空要素は拒否。
- 同一ラベル: ASCII 小文字化した値で比較し、重複を拒否する。
- レコード終端: head から次の `GoA[` または改行までを候補とする。次の有効 head が終端理由である場合だけ、その直前のレコード間 `/` を除く。改行・`)`・HTML comment 終端時の末尾 `/` は除去せず parser へ渡す。最初の `)` 以降と HTML comment 以降は provenance suffix として除くが、それ以前の不正 token は除去しない。

## Fail-closed ルール

| クラス | 代表入力 | 結果 |
|---|---|---|
| duplicate-label | `c1 1x1 / C1 2x1` 等、Q1 の同一性で重複 | レコード全体を拒否 |
| bin-sequence | `9x1`、`2x1 1x1`、`1x1 1x2` | レコード全体を拒否 |
| malformed-token | sparse の後続セグメントの無効ラベル、`1xz`、bin/count 以外の token | レコード全体を拒否 |
| empty-segment | 先頭/末尾 `/`、`/ /` | レコード全体を拒否 |

エラー文字列は順に `sparse/duplicate-label: ...`、`sparse/bin-sequence: ...`、`sparse/malformed-token: ...`、`sparse/empty-segment: ...` とする。colon より前を安定識別子、後を入力由来の詳細とし、既存 canonical 失敗文言は変更しない。

## 互換性と変更禁止

- 既存 `GoaBreakdown.votes` は固定長8要素のまま。`segments` は optional additive field である。
- canonical 行を sparse として再解釈しない。8-bin 不足・順序不正は従来どおり失敗する。
- 圧縮形 election ID の受理ピンを削除しない。新規書込の自然形受理を追加する。
- `handleOpen` のロジックは変更せず、期待形式の文言だけを `^E-[A-Z0-9]+(-[A-Z0-9]+)*$` と同値にする。
- corpus occurrence 数を固定値21にハードコードしない。integration test が実行時の memory 層から head 数を機械導出し、返却件数と照合する。unit test は読み込み済み文字列 fixture を注入し、実 FS を触らない。

## 受け入れ判定

1. Happy path と4エラークラスをそれぞれ独立テストで固定する。
2. corpus sweep は integration 層で head 数、抽出数、parse 成否分類を別々に assert し、抽出漏れを成功に見せない。unit 層は純粋な parser/extractor に文字列 fixture を渡す。
3. ECODE の旧/新 regex count を同一 corpus で比較し、全長 match を別 assert で固定する。
4. `GOA_LINE_CODE_RE` の複節正例・非 E-code 負例・圧縮形後方互換を固定する。
5. dist/self-install、typecheck、lint、関連 test、全 CI、lcov の追加行未カバー0を完了条件とする。
