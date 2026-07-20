# Functional Design Questions — goa-sparse-acceptance

上流入力(consumes 全数): unit-of-work.md、unit-of-work-story-map.md、requirements.md、components.md、component-methods.md、services.md

## E-OC1 判定

- Q1 は FR-1(iii) が Functional Design へ明示委譲した未決の受理文法であり、選挙が必要。
- fail-closed の4拒否クラス、戻り値 shape、レコード抽出境界、GoaLineCode/ECODE_RE の変更形は requirements.md と decisions.md で既決のため再質問しない。
- 選挙依頼: 2026-07-20T06:25:40Z〜06:27:03Z に leader へ送付。E-GSFFD1〜3 として開催し、2026-07-20T06:41:56Z に全3件 A(各3-0、GoA favor 3 / against 0、留保なし)の裁定を受領。

## Q1. スパース GoA のサブ問ラベル文法と重複判定

実 corpus のラベルは `c1` / `C1` 形のみ。`/` で区切る各セグメントは「ラベル + 1個以上の `1x<n>`〜`8x<n>` token」で、欠落 bin は0として集約する。受理域をどこまで開くか。

- A. corpus 最小文法: `/^[cC][1-9][0-9]*$/`。表記は保存し、重複は ASCII 小文字化したラベルで判定する。token はセグメント内で昇順・重複不可。
- B. 汎用識別子文法: `/^[A-Za-z][A-Za-z0-9-]*$/`。表記は保存し、重複は ASCII 小文字化したラベルで判定する。token はセグメント内で昇順・重複不可。
- C. canonical 小文字文法: `/^c[1-9][0-9]*$/`。大文字 `C1` は拒否し、token はセグメント内で昇順・重複不可。
- X. Other (please specify)

[Answer]: A — corpus 最小文法 `/^[cC][1-9][0-9]*$/`。表記保存、ASCII 小文字化ラベルで重複拒否、token はセグメント内で昇順・重複不可(E-GSFFD1、3-0、2026-07-20T06:41:56Z 裁定)

## Q2. `extractGoaRecords` のレコード終端

実 corpus には1物理行複数レコード(` / GoA[...]`)と、最終レコード直後の provenance prose(`)` / `<!-- cid:... -->`)が共存する。ADR-4 の「次の `GoA[` 直前」だけでは最終レコードの末尾を閉じられない。どの境界契約にするか。

- A. 構造境界: head occurrence から「次の `GoA[` または改行」までを候補とし、候補末尾のレコード間 `/`、最初の `)` 以降、HTML comment 以降だけを除く。body 内の不正 token は温存して `parseGoaLine` に拒否させる。
- B. 文法 prefix 抽出: head 以降で正当な label/bin token が続く最長 prefix だけを返す。不正 suffix は抽出外になる。
- C. 行単位: 改行までをそのまま返し、複数レコードや provenance の分離を `parseGoaLine` に担わせる。
- X. Other (please specify)

[Answer]: A — head から次の `GoA[` または改行までを候補とし、末尾のレコード間 `/`、最初の `)` 以降、HTML comment 以降だけを除去。不正 token は温存して parse で拒否(E-GSFFD2、3-0、2026-07-20T06:41:56Z 裁定)

## Q3. `ParseFailure.error` のスパース拒否契約

ADR-2 の4拒否クラスをテストと将来消費者が安定して識別できる表現はどれか。

- A. 安定 prefix + 詳細: `sparse/duplicate-label: ...`、`sparse/bin-sequence: ...`、`sparse/malformed-token: ...`、`sparse/empty-segment: ...`。型は変更しない。
- B. 自然文のみ: 既存 error style に合わせ、固定 prefix は設けない。
- C. 構造化 code: `ParseFailure` に errorCode を追加して4分類する。
- X. Other (please specify)

[Answer]: A — `ParseFailure` の型を変えず、`sparse/duplicate-label`、`sparse/bin-sequence`、`sparse/malformed-token`、`sparse/empty-segment` の安定 prefix + 詳細を返す(E-GSFFD3、3-0、2026-07-20T06:41:56Z 裁定)
