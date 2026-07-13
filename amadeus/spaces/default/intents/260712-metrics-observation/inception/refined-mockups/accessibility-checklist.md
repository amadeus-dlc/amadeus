# Accessibility Checklist — metrics-observation(CLI/機械消費文脈への適用)

- [x] 出力は色・装飾に依存しない(verdict は先頭語 OK/FAILED のテキストで判別可能)
- [x] 機械可読(JSON)と人間可読(1行 verdict)の両立 — スクリーンリーダー/grep の双方で判別可能
- [x] 失敗時に「何が・なぜ」が1行に含まれる(失敗 collector 名+原因要約)
- [x] タイムスタンプは ISO8601/UTC(ロケール非依存)
- [x] ファイル名は ASCII のみ(クロスプラットフォーム安全 — nfr-requirements:c3 の Windows 予約文字照合は design 段で最終確認)
