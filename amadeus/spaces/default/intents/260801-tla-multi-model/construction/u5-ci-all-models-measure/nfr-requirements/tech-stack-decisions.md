# Tech Stack Decisions — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): business-logic-model(u5 functional-design §0 / §12.1 — 変更輪郭・所有ファイル), business-rules(BR-F1 / BR-O2), requirements(NFR-4, Constraints)

## 決定: 技術スタックは現行のまま — 新規選定なし

本 Unit は既存ツールの引数化・反復拡張であり、新しい技術要素の導入を伴わない。NFR-4(新規外部依存なし)がそのまま本 Unit の技術選定制約である。

- **言語 / ランタイム**: TypeScript on Bun(既存 plugin tools と同一)。新規ランタイム導入なし。
- **変更対象**: `plugins/formal-model-check/tools/` 配下の既存 TypeScript ツール7ファイル(所有4 + 追加所有3、BLM §12.1)+ ci.yml + stage doc。
- **検証基盤**: 既存の docker + tla2tools(固定 jar、Assumptions A1)をそのまま使用。TLC バージョン・docker isolation 機構は変更しない(BR-F2)。
- **CI**: GitHub Actions 既存ジョブの表示層のみ変更。ワークフローエンジン・ランナーイメージの変更なし。
- **共有実装の方針**: 統計抽出は `run-model-check-diagnostic.ts` の `extractDiagnosticStatistics` を共有し、複製実装を置かない(BR-E4)。新規ユーティリティライブラリの導入も行わない。

## N/A 判定

- フレームワーク / DB / インフラツールの選定: **N/A** — 新規の永続化・サーバ・外部サービス連携がなく、選定対象が存在しない。upstream の requirements NFR-4 と Constraints(生成ツリーは `bun scripts/package.ts` 再生成、dist 手編集禁止 — BR-O2)を遵守することが本 Unit の技術決定の全て。
