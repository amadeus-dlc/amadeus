# NFR Requirements Questions — goa-sparse-acceptance

上流入力(consumes 全数): `business-logic-model.md`、`business-rules.md`、`requirements.md`、`technology-stack.md`。

## E-OC1 判定申告

- 判定時刻: 2026-07-20T07:23:37Z
- conductor 判定: 3問とも選挙不要。いずれも新しい設計選択ではなく、承認済み FR/FD と現行リポジトリ境界からの機械導出である。
- Q1 根拠種別: 機械導出。対象は同期・in-process の文字列 parser/extractor で、外部 I/O・ネットワーク・サービス SLI がない。FR-1/BR-5 と、現行 `loadRules()` が memory 層を `RuleFile[]` へ全件 materialize した後に文字列を同期走査する境界から、service latency SLO を発明せず線形性と回帰計測を要件化する。Architecture review iteration 2 で、別の record/audit corpus 用 generator を memory 層の streaming 根拠に誤帰属していた点を捕捉し、本記述へ是正した。
- Q2 根拠種別: 機械導出。入力は version-controlled Markdown と CLI election ID、機密データ・認証・認可・外部境界を追加しない。FR-1〜FR-3/BR-4/BR-8〜BR-10 の fail-closed 受理境界が security 要件の全対象で、規制 framework は非該当。
- Q3 根拠種別: 既決要件の集約。FR-4/BR-11/BR-12 が canonical 互換、dist 同期、corpus sweep、lcov/CI を既に固定している。availability/RTO/RPO は常駐 service/data store を追加しないため N/A とし、決定論・失敗原子性・配布同一性を reliability/scalability の検証軸にする。
- leader 承認: 2026-07-20T07:24:21Z。Q1〜Q3 は全て選挙不要で可。質問ファイルを実読し、各根拠が機械導出または既決要件の集約であり、新規設計判断を含まないことを確認。

## Q1. Performance / Scalability の対象をどこまで定量化するか

本 Unit は常駐 service ではなく、ローカル CLI が呼ぶ同期 parser/extractor である。外部 latency SLO・同時利用者数・RPS を発明せず、入力長と occurrence 数に対する単一走査・線形増加を構造要件とし、既存 corpus と合成 fixture の回帰テストで検証する。固定ミリ秒閾値は環境依存のため置かない。

後続の E-GSFNR1 裁定では A を3-0で採用した。bounded-pass(one forward cursor / no full-input rescan)と、`N=1/2/4` の生成 fixture に対する shape/count scaling を機械 assert し、wall-clock 値は合否 gate にしない。留保は「NFR-designでcursor単調前進またはscan invocation上限の決定論的seam/検査へ落とし、走査回数上限もassertすること。」であり、具体 seam は NFR-design に引き渡す。

[Answer]: E-OC1 承認 2026-07-20T07:24:21Z — service latency SLO/RPS は N/A。入力バイト・token・occurrence に対する単一走査、既存 `loadRules()` 全件 materialization を増幅する追加の全層連結なし、既存 corpus と合成 fixture の回帰計測を要件とする。file-at-a-time streaming は memory 層の現行契約ではない。

## Q2. Security / Compliance の適用境界は何か

新規の認証・認可・暗号・秘密情報・外部通信はない。security 要件は、GoA/E-code 入力を parse 境界で全件検証し、不正 sparse token・重複 label・不正 bin・不正 E-code を部分受理せず型付き失敗へ落とすこと、入力由来詳細を既存 error 契約以上に拡張しないことに限定する。PCI-DSS/HIPAA/GDPR 等のデータ処理は非該当で、新規 compliance control を導入しない。

[Answer]: E-OC1 承認 2026-07-20T07:24:21Z — 新規の認証・認可・暗号・外部通信・規制 control は N/A。既決の fail-closed parse 境界、部分受理禁止、既存 error 契約の非拡張を security/compliance 要件とする。

## Q3. Reliability / Observability の完了条件は何か

service availability/SLA、backup、RTO/RPO、metrics/tracing は非該当。代わりに、(1) canonical/旧圧縮形の後方互換、(2) sparse の全体 fail-closed、(3) corpus occurrence 抽出漏れ0、(4) dist 6面+self-install の byte 同期、(5) stable error prefix と既存エラー文言の非退行、を決定論的テストと既存 CI で検証する。新しい runtime logging/telemetry は追加しない。

[Answer]: E-OC1 承認 2026-07-20T07:24:21Z — service availability/RTO/RPO/metrics/tracing は N/A。後方互換、失敗原子性、corpus 抽出完全性、stable error prefix、dist/self-install 同一性を決定論的 test/CI で検証する。
