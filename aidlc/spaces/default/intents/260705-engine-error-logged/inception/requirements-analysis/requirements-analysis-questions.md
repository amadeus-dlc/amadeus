# Requirements Analysis 質問（260705-engine-error-logged）

対象 Issue: [#431](https://github.com/amadeus-dlc/amadeus/issues/431)

Maintainer の包括委任（sub 割り当て）に基づき、推奨案で自己回答する。

---

## Q1. 記録対象の範囲は？（Issue 未確定事項 1）

A. error directive の全件 + トップレベル未捕捉例外（利用者の入力ミス由来も含む）
B. エンジン内部の異常（state 不整合、graph 欠落、未捕捉例外）に限定
X. Other (please specify)

[Answer]: A（audit は追記型の履歴であり、入力ミス由来の error も「workflow が前へ進まなかった証拠」として後からの分析対象になる。B の内部/外部の線引きは emit 箇所ごとの分類保守を生み、分類漏れ = 記録漏れの再発点になる。全件 + best-effort が最も単純で漏れがない。なお全件記録は本 Intent の新規導入ではなく、他の全ツール CLI が emitError 経由で既に採用している既存契約への追随であり、入力ミス反復による肥大化リスクの受容水準も既存と同じである）

## Q2. workflow record が特定できない段階のエラーの記録先は？（Issue 未確定事項 2）

A. 既存 emitError と同じ挙動に合わせる: state file が cwd に無ければ no-op（記録しない）
X. Other (please specify)

[Answer]: A（Issue の実施候補 3 が示す方向。初期化前のエラーは記録先の record 自体が無く、別の置き場を発明するのは全ツール共通契約からの逸脱になる）
