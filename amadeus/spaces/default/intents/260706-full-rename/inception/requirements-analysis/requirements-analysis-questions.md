# Requirements Analysis 質問（260706-full-rename）

対象 Issue: [#526](https://github.com/amadeus-dlc/amadeus/issues/526)

回答は #526 の確定判断コメント（Maintainer、2026-07-06）、leader ディスパッチ（2026-07-06 13:00 JST）、実測棚卸しからの出典付き転記である。

現行構造の前提は上流入力の [codekb/amadeus/architecture.md](../../../../codekb/amadeus/architecture.md)、[codekb/amadeus/code-structure.md](../../../../codekb/amadeus/code-structure.md)、[codekb/amadeus/component-inventory.md](../../../../codekb/amadeus/component-inventory.md) に依る。

---

## Q1. rename の範囲は？

A. 全面（workspace ルート aidlc/ → amadeus/、aidlc-state.md → amadeus-state.md、/aidlc コマンド、エンジン・skill・validator・installer・hooks・sensors・eval・docs の追従）
B. workspace ルートのみ
X. Other (please specify)

[Answer]: A（#526 確定判断コメントの転記: 候補 1 を採用。「部分 rename では名前空間が混在し、かえって混乱を残す」。leader 推奨の候補 2 は不採用と明記）

## Q2. /aidlc の新コマンド名は？

A. `/amadeus`（公開 skill 名 = amadeus と一致させる）
B. 別名
X. Other (please specify)

[Answer]: A（確定判断は「/aidlc コマンドの rename を含む全面適用」であり、公開入口 skill は既に `amadeus` の 1 個（AMADEUS.md）。表記 106 ファイルの `/aidlc ...` を `/amadeus ...` へ揃える。単独実行 stage runner の呼称（`/aidlc --stage <slug> --single` の説明文）も同時に追従する）

## Q3. エンジン内部マーカー（.aidlc-sensors / .aidlc-hooks-health / .aidlc-compose-pending / .aidlc-plan.json 等）は含むか？

A. 含む（.amadeus-* へ改名。既存 record 内の .aidlc-sensors ディレクトリは git mv で移設）
B. 含まない（内部名として維持）
X. Other (please specify)

[Answer]: A（確定判断の「一貫性を優先」の帰結。部分残存は Q1-B と同じ名前空間混在を生む。parity は nameMappings のトークン拡張で吸収する = ディスパッチ作業指示 4。ただし実装順は設計で確定し、旧マーカーの残存は rename-leftovers eval の検出対象へ反転させる）

## Q4. examples/**/aidlc の snapshot はどう扱うか？

A. 同一 PR で amadeus/ へ git mv し、provenance（md5）は移設では更新しない（内容不変のため）
B. 後続 Intent に分ける
X. Other (please specify)

[Answer]: A（Issue 本文の影響範囲に examples snapshot が明記されており、残すと利用者向けの誤情報（旧構造の見本）になる = rename の根拠そのもの。内容改変を伴わない git mv のため provenance 再生成は不要。実 provider 再生成が必要になった場合だけ後続で更新する = project.md の md5 規約）

## Q5. 上流パリティとの整合はどう再定義するか？

A. nameMappings へ workspace root（aidlc→amadeus）、状態ファイル（aidlc-state.md→amadeus-state.md）、コマンド表記（/aidlc→/amadeus）、内部マーカー（.aidlc-*→.amadeus-*）のトークン写像を追加し、パリティ検査は「写像後 byte 一致」の従来意味論を維持する。docs は「構造・意味論は v2 互換、名前空間は Amadeus」へ再定義し、aidlc-state.md 保護を前提にした既存検査（parity eval C10 の .md ガード pin 等）は新前提へ更新する
B. engineFileExceptions を大量追加する
X. Other (please specify)

[Answer]: A（ディスパッチ作業指示 4 の転記: 「parity は nameMappings の拡張で対応し、engineFileExceptions の増加を最小化する」。v2 互換の再定義は承認要旨 ⑥。AMADEUS.md 作業言語節の「機械可読・構造的成果物は v2 の構造と英語ラベルをそのまま使う」は「構造と英語ラベル」の主張として維持され、ファイル名だけが Amadeus 名前空間になる）
