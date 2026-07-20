# Performance Design — goa-sparse-acceptance

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 決定

E-GSFND1 Aに従い、core正本`amadeus-norm-metrics.ts`へexported pure `scanGoaHeads(text)`を置く。返却値は、実際にrecord抽出へ使うhead開始offset列と、同じforward loop内で実行した`RegExp.exec`呼出し回数で構成する。`extractGoaRecords(text)`はこの結果を一度だけ取得し、隣接offset・改行・構造suffix境界からrecordをsliceする。別の全文head再探索を行わない。

概念契約:

- `offsets`: 入力順のhead開始位置。全要素が前要素より大きい。
- `execCalls`: forward loop内で実`exec`を呼ぶたびに同じ基本ブロックで1増加する。成功`H`回と終端null 1回のため`H+1`。
- 共有global regexの`lastIndex`を跨いで保持せず、呼出しごとに同じsource/flagsからscan instanceを初期化する。
- scan証拠を後付け計算しない。productionのrecord境界に使わない別counterやtest-only branchは禁止する。

## 機械検証

同一の有効record blockを`N=1/2/4`回連結するtable testで、各ケースについて次をassertする。

1. `offsets.length === H`かつ`extractGoaRecords(text).length === H`。
2. 全`i>0`で`offsets[i] > offsets[i-1]`。
3. `execCalls === H + 1`。
4. 入力バイト、head件数、record件数が`N`に比例し、各recordのparse shapeは不変。
5. 同一物理行複数head、改行終端、provenance suffixを混在させても上記不変条件が成立する。

wall-clockは診断値として記録可能だが合否には使わない。固定ms、相対倍率、benchmark frameworkを追加せず、走査証拠とshape/count scalingを性能gateとする。

## 非採用案と資源境界

- observer引数を公開`extractGoaRecords` APIへ追加しない。将来変更する場合も内部seamかつ実exec同一loop通知に限定し、再選挙する。
- source文字列grepによるloop形状testはruntime挙動を証明しないため採用しない。
- cache、pool、async worker、CDN、paginationはローカル同期文字列変換に非該当。
- memory層は既存`loadRules()`の`RuleFile[]`全件materializationを保存し、全memory bodyを再連結した追加コピーを作らない。

## E-code occurrence count非退行

`ECODE_RE`は先頭単節だけを切り出す現行形から、複節全体を1 matchで返す`\bE-[A-Z0-9]+(?:-[A-Z0-9]+)*`へ広げる。これはmatch範囲だけの拡張であり、`countMatches`が消費するoccurrence数を変えない。

- 同一memory corpusに旧regexと新regexを適用し、`matchAll`件数が等しいことをassertする。母数は実行時に導出し、189等の履歴値を固定しない。
- `E-SDE-CG4`を新regexが1 occurrenceのまま文字列全長で返し、旧regexは同じoccurrenceの先頭単節だけを返す対照をassertする。
- `countMatches`の呼出し・加算構造は変更せず、同じ入力の`ecodeOccurrences`総数が前後で等しいことをintegration testで確認する。
- `ECODE_RE`はprose内を走査する非anchored occurrence matcherであり、値validatorではない。`E-ABC-`や`E-ABC-x`では有効prefix `E-ABC`をmatchし得るため、文字列全体の拒否を本componentへ要求しない。全値anchored拒否は別所有面の`GoaLineCode.parse`だけが担い、両者のaccepted languageを同一と表現しない。

## 引き渡し

code-generationはpure scan seamとwrapperを同一正本で実装し、unit層で`N=1/2/4`を駆動する。あわせて`ECODE_RE`の旧/新count対照と複節全長matchを同じ正本testへ置く。build-and-testは実測`H`、offset単調性、`execCalls=H+1`、E-code occurrence count前後一致、関連test/全CI/patch coverageを確定値として記録する。
