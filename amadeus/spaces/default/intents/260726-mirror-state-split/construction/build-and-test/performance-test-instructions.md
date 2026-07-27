# Performance Test Instructions — 260726-mirror-state-split

上流入力(consumes 全数): code-generation-plan.md、code-summary.md(いずれも construction/fix-mirror-state-split/code-generation/ — 検証対象の Steps・FR 対応・実測 exit code の導出元)。

## 比例選定(Minimal)

本変更(code-summary.md の diff)は CLI の read 経路の権威切替+デッドコード削除であり、承認済み性能 NFR・実在する性能境界への trace を持たない。よって新規性能試験は生成しない(戦略名だけで検査を機械追加しない — 既定 CI の性能契約テスト群は run-tests.sh --ci に含まれ green)。

## 根拠

- code-generation-plan.md の Steps に性能要件なし。読取は既存 parseMirrorStateDocument の再利用で計算量クラス不変
