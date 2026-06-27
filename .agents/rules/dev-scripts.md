# Script Rules

このルールは、このリポジトリでスクリプトを書くときに適用する。

## 基本方針

すべてのスクリプトは、Bun と TypeScript を前提にする。

スクリプトとは、skill 開発、eval、昇格判断、差分確認、repo 内サンプル成果物の検証、validator、package script から呼ぶ処理に使う実行ファイルである。

実装は必ず TDD スタイルで進める。
先に失敗する検証を書き、失敗を確認してから最小実装を入れる。
検証が通った後でだけ整理やリファクタリングを行う。

## 対象

- `dev-scripts/**`
- `scripts/**`
- `skills/**/scripts/**`
- `skills/**/validator/**`
- `.agents/skills/**/scripts/**`
- `.agents/skills/**/validator/**`
- `package.json` の `scripts`
- eval や validator の開発用ラッパー

## MUST

- 実装前に、対象の振る舞いを確認するテスト、eval、validator、または決定論的な検証を追加する。
- 追加した検証が、実装前に失敗することを確認する。
- 失敗を確認した検証を通すための最小変更だけを入れる。
- 実装後は、追加した検証と関連する既存検証を実行する。
- 新規スクリプトは `.ts` で作る。
- 新規スクリプトは `bun` で実行できるようにする。
- 既存スクリプトを大きく変更する場合は、Bun と TypeScript へ移行する。
- `package.json` から呼ぶ検証入口は、短い名前で実行できるようにする。
- shell に複雑な処理を直接書かず、TypeScript 側に寄せる。
- ファイル探索、JSON 解析、差分検査は、文字列連結だけに頼らず、標準 API または小さな helper に寄せる。
- 一時ディレクトリを作る検証は、成功時も失敗時も片付くようにする。

## SHOULD

- テスト名、eval 名、検証メモは、実装詳細ではなく観測できる振る舞いを表す。
- 複数の振る舞いを扱う場合は、1つずつ RED、GREEN、REFACTOR の順で進める。
- 既存の Ruby、Python、shell script は移行対象として扱う。
- 既存の Ruby、Python、shell script を一時的に残す場合は、理由を差分か検証メモで説明する。
- `npm test` や `npm run test:*` は、Bun で書いた検証スクリプトを呼ぶ薄い入口にする。

## 例外

例外は最小限にする。

既存スクリプトをすぐに移行できない場合でも、新しい検証観点は既存 Ruby、Python、shell script に追記しない。
Bun と TypeScript のスクリプトへ分離する。

## MUST NOT

- テスト、eval、validator なしで実装だけを追加しない。
- 失敗確認をせずに GREEN として扱わない。
- RED の状態でリファクタリングしない。
- 新規スクリプトを Ruby、Python、複雑な shell script で追加しない。
- `package.json` の `scripts` に長い shell 処理を直接書かない。
- repo root の開発用スクリプトを、skill の実行時依存として扱わない。
