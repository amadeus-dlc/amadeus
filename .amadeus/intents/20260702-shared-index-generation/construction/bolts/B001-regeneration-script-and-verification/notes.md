# B001 実行メモ

## 実行方針

- Script Rules に従い、検証先行（RED から GREEN）で進める。T001 で失敗する検証を先に追加し、RED を確認してから T002 の最小実装を入れる。
- 検証の配置は `dev-scripts/evals/index-generate/check.ts` とし、`state-scaffold` の既存 eval と同じ構成（一時ディレクトリの fixture workspace、`package.json` の `test:it:*` 入口）を使う。
- スクリプトは `StateScaffold.ts` と同じ配置（`skills/amadeus-validator/scripts/`）と CLI 形式（第 1 引数 workspace）に合わせる。
- 生成ロジックは export し、B002 の validator 検査から再利用する。B001 の時点では validator 本体を変更しない。
- promote 同期は B003 で行う。B001 は source（`skills/`）の実装と検証までを完了条件にする。

## 対象タスク

- T001: 検証の先行追加と RED 確認。
- T002: `IndexGenerate.ts` の実装と GREEN 確認。

## 作業順序

1. T001 で fixture workspace と検証ケースを作り、RED を記録する。
2. T002 で生成ロジックと CLI を実装し、GREEN を確認する。

## 実装で確定した判断

- 生成マーカーは exported constant（`INTENTS_MARKER`、`DISCOVERIES_MARKER`）とし、文言は「生成物: 直接編集しないでください。intents/（または discoveries/）配下の各モジュールを更新し、`bun run IndexGenerate.ts <workspace>` で再生成してください。」の HTML コメント 1 行にする。B002 の検査と B003 のテンプレート更新はこの定数を参照する。
- `intents.md` の導出に `state.json` は使わない。概要と依存の定義元をモジュールファイルだけにする BR003 に合わせた（BL001 の記述も実装に合わせて修正済み）。
- 依存関係表は、各 Intent モジュールの `## 依存` 表の行を 1:1 で採用する。複数依存を持つ Intent は依存関係表で複数行になる（現行実ファイルの手書き結合形式とは行粒度が異なる）。既存 validator の `checkTableTargets` は行の一意性を要求しないため互換である。B004 の migration では既存の結合済み理由を依存ごとに分割する。
- 生成関数（`buildIntentsIndex`、`buildDiscoveriesIndex`）は `process.exit` を呼ばず `HeadingContractViolationError` を throw し、CLI 層だけが exit する。B002 の validator が import しても呼び出し元プロセスを終了させない。
- Discovery モジュールの `## 推奨次アクション` 欠落も見出し契約違反として検出する（fail-loud の対称性）。
- Discovery の H1 が「 Discovery Brief」で終わらない場合はエラーにせず、H1 全体をテーマとして採用する（寛容フォールバック）。

## 未確認事項

- B004 の migration で、既存依存関係表の結合済み理由を依存ごとに分割する際の文言調整は migration 時に確定する。
- H1 の寛容フォールバックを厳格化するかは、B004 で実データと examples のパターンを確認して判断する。
