# Memory: build-and-test

## Interpretations

- このリポジトリの「ビルド」は型検査（tsc --noEmit）で代替されると解釈した。

## Deviations

- 逸脱なし。テストの実行と記録だけを行い、実装の修正は発生しなかった。

## Tradeoffs

- 性能テストとセキュリティテストは対象外にした（成果物は Markdown 契約と開発用スクリプトであり、対応するテスト種別がない）。

## Open questions

- real provider の e2e（steering / event-storming）は CI に含まれない。実行タイミングの規約化は将来の検討事項である。
