# Tech Stack Decisions — u2-loader-generalization

**Intent**: 260801-tla-multi-model / **Stage**: nfr-requirements / **Unit**: u2-loader-generalization(C3)

上流入力(consumes 全数): business-logic-model(§2.1 結線, §3 型), business-rules(BR-D4), requirements(NFR-4, Constraints)

## 決定

| # | 決定 | 根拠 |
|---|---|---|
| TS-U2-1 | 言語・ランタイム・ツールチェインは現行のまま: TypeScript / Bun(1.3.x)/ bun:test。フレームワーク・ライブラリの追加・変更なし | NFR-4(新規外部依存なし)。既存の loader と同じ Bun + 注入 fs の seam 構造を踏襲する |
| TS-U2-2 | 推移解決・宣言照合の実装は u1 の `tla-module-deps.ts` 単一実装を import して共有し、loader 側に抽出・比較の複製実装を置かない。loader の責務は readModule アダプタとエラー変換のみ | BR-D4, ADR-2(単一実装原則)。複製実装はドリフトの新たな発生源になるため禁止 |
| TS-U2-3 | スキーマ型(`ModelMapModel.auxiliaries` 等)は `tla-model-map.ts` 経由で消費する。byte-identical 2 複製(plugins / packages/framework/core)の同期は u1 の責務として据置き、u2 は型の消費者に留まる | unit-of-work u2 所有ファイル節, 依存 DAG |
| TS-U2-4 | 旧 singular API は期間限定の互換 shim として残し、内部は新パイプラインへの薄い射影に一本化。除去条件(u3 の複数形 API 追随完了)を満たした時点で u3 が削除する | BR-S4(Finding-1 裁定、選択肢 (a))。即時削除は u2 着弾〜u3 着弾間の typecheck / 既存テストを壊す |
| TS-U2-5 | 生成ツリー(dist/ 等)は本 Unit 最後に `bun scripts/package.ts` 再生成で追随(手編集禁止) | requirements Constraints, unit-of-work 共通契約節 |

## 非適用の判断

新規技術選定(DB・メッセージング・インフラ・フロントエンド等)は発生しない。本 Unit は既存 TypeScript モジュール2ファイルの改訂のみで、選定の余地があるのは「実装の共有方式」(TS-U2-2)と「互換 shim の扱い」(TS-U2-4)のみであり、両者とも上流 ADR(ADR-2 / ADR-4、Finding-1 裁定)で裁定済みのものを確定記載した。
