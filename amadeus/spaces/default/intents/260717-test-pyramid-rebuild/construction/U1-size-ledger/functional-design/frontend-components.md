上流入力(consumes 全数): unit-of-work.md, unit-of-work-story-map.md, requirements.md, components.md, component-methods.md, services.md

# フロントエンドコンポーネント — U1 サイズ分類台帳(SizeLedger)

## 該当なし(N/A — 反証可能な不存在根拠)

本ユニット(U1 SizeLedger、FR-1)は **UI を持たない CLI/データ成果物** であり、フロントエンド/UI コンポーネントは存在しない。したがって本書の対象(画面・コンポーネント階層・状態管理・ユーザーインタラクション)は **該当しない(N/A)**。

この N/A は「未検証」でも「PASS」でもなく、**反証可能な不存在** である(project.md deployment-execution:c3 の N/A / NOT EXECUTED / PENDING / PASS 分離、observability:c3 / environment-provisioning:c3 の N/A 分離規律に倣う):

- **反証可能根拠1**: 本ユニットの成果物は record 台帳データ(`SizeLedger` = tier×size マトリクス + 全 442 行、component-methods.md:39-43)であり、レンダリングされる view・DOM・クライアント状態を一切持たない。
- **反証可能根拠2**: 対象フレームワークは利用者向けランタイムサービス・UI を持たない CLI/ツール系である(services.md:5-15、project.md「Deployment: デプロイ基盤は持たず、リリースは npm パッケージ配布と GitHub 上のタグ/PR 履歴で管理」)。
- **反証可能根拠3**: requirements.md の FR-1〜7 はすべて台帳・規約・ゲート設計・計画に閉じ、UI/画面/フロントエンドの記述は一切ない。
- **反証可能根拠4**: 出力形式は既存 CLI 兄弟の様式に倣う台帳ファイル形式(既存 `test_pyramid` コレクタ `scripts/metrics-snapshot.ts:97-104` の `${tier}_${size}` キー集計、`buildTestSizeReport` `tests/lib/test-size.ts:175-183` の JSON レポート様式)。新規 UI 様式を発明しない(ui-less-mockups-as-output-contract の系列 — 出力は台帳データ契約であって画面ではない)。

## 出力提示形態(UI の代替 = データ成果物)

UI が無い代わりに、本ユニットの利用者向け提示は **台帳データそのもの** である。既存 CLI 兄弟の様式に揃える(新規発明しない):

- **提示 = 台帳ファイル/レコード**: `SizeLedger`(`observedRef` + `rows` + tier×size `matrix`)。人間可読の tier×size マトリクス表(business-rules.md 掲載表)と機械可読の `${tier}_${size}` キー集計の2面を、既存コレクタ・レポート様式に整合させて提示する。
- **インタラクション無し**: 生成は決定的スイープ(オンデマンド、常駐しない、services.md:32-34)。ユーザー操作・イベントハンドラ・遷移は存在しない。
- **N/A を PASS と偽装しない**: 本書は「フロントエンド検証成功(PASS)」を主張しない。フロントエンドが **存在しないこと** を反証可能根拠付きで記録するのみ(deployment-execution:c3 の分離 — N/A ≠ PASS ≠ NOT EXECUTED)。

## 実装スコープ境界(Out 明記)

- 本ユニットに UI 実装は存在せず Out 以前に対象外。台帳データ成果物の実生成スクリプトも本 intent Out(FR-1 将来条件 requirements.md:47、unit-of-work.md:68)。
- 将来 UI(台帳ビューア等)を作る計画も本 intent には無い。必要になれば別 intent の新規スコープとして扱う。
