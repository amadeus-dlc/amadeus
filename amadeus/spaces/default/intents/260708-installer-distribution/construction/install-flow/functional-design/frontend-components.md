# Frontend Components — install-flow(CLI 対話サーフェス)

> ステージ: functional-design (3.1) / Unit: install-flow / 作成: 2026-07-08
> 出典: `../../../inception/user-stories/stories.md`(US-A1〜A6)、`../../../inception/requirements-analysis/requirements.md`(CLI Contract)。GUI は存在しないため、本ドキュメントは **CLI 対話サーフェス**(ウィザード・プロンプト・出力レイアウト)を「フロントエンド」として設計する

## 対話フロー階層

```
amadeus-setup install
├─ [不足時] ハーネス選択(4択リスト: claude / codex / kiro / kiro-ide)
├─ [不足時] 導入先入力(既定: cwd)
├─ 選択サマリー+最終確認(y/N)
├─ 適用前レポート(FR-007: add/update/skip/backup/conflict の5分類一覧)
├─ [衝突時] 続行確認(y/N)
└─ 完了出力(導入結果+検証結果+ネクストステップ)
```

## 出力レイアウト仕様(reporter が生成、cli が出力)

- **適用前レポート**: 分類ごとにセクション化し、force 適用エントリには `(forced)` 印(BR-I12)。合計行(PlanSummary)を末尾に置く
- **エラー表示**: 1行目に分類(dns / conn / http / rate-limit / usage 等)、2行目以降に検出内容、最終行に再実行案内(`guidance()` 由来)— US-A7
- **完了出力**: ハーネス・バージョン(タグ)・導入先・検証チェック結果、続けて「次の一歩」(`/amadeus` の始め方)— US-A6
- 出力は装飾に依存しない(CI ログでの可読性優先。色は TTY 検出時のみ任意)

## 入力バリデーション(フォーム相当)

| 入力 | 検証 | エラー時 |
|------|------|----------|
| ハーネス選択 | `HarnessName.parse`(4値、本 Unit 所有) | invalid-harness(選択式では発生しない — 非対話フラグ経路用) |
| 導入先 | 存在するディレクトリ or 作成可能パス | 実行時エラーとして分類表示 |
| 確認プロンプト | y/N(既定 N — 安全側) | N は中断(終了コード 1、ファイル無変更) |

## 状態と副作用の境界

- ウィザードの状態(選択途中の値)は `runWizard` のローカルに閉じ、確定後 `InstallInputs`(内部ファクトリ経由、公開コンストラクタなし)として不変値になる
- プロンプト I/O は `TtyIO` ポート経由(DI)。非 TTY 環境でウィザード経路に入らないことは BR-I02 のモード判定で保証
