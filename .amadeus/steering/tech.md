# 技術スタック

この文書は、複数 Intent で共有する技術判断、開発標準、実行環境を扱う。

依存ライブラリの網羅ではなく、開発判断に影響する技術だけを記録する。

## アーキテクチャ

- Amadeus は、source skill、昇格先 skill、validator、example snapshot、開発用スクリプトで構成する。
- skill の source は `skills/amadeus-*` に置く。
- 昇格先成果物は `.agents/skills/amadeus-*` に置く。
- example snapshot は `examples/**/.amadeus` に置く。

## 主要技術

| 領域 | 技術 | 根拠 | 状態 |
|---|---|---|---|
| 実行 | Bun と TypeScript | 開発用スクリプトと validator は Bun と TypeScript を前提にする。 | 採用 |
| 検証 | `npm run test:all` | repo 全体の標準検証入口である。 | 採用 |
| PR 管理 | GitHub Issue と Pull Request | Issue を Intent の入口、PR を変更のレビュー単位として扱う。 | 採用 |

## 開発標準

### 型安全性

- TypeScript で書くスクリプトと validator は `tsc --noEmit` を通す。

### 品質基準

- skill、validator、example、docs の成果物境界を分ける。
- 後方互換は、明示的な互換性維持対象がない限り残さない。

### テスト

- 標準検証は `npm run test:all` とする。
- validator や開発用スクリプトの変更は、先に失敗する eval または検証を追加する。

## 開発環境

### 必須ツール

- Node.js
- Bun
- npm
- GitHub CLI
- mise

### 代表コマンド

```sh
npm run test:all
bun run dev-scripts/promote-skill.ts <skill-name> --replace
npm run examples:generate:real
```

## 主要技術判断

- source skill と昇格先成果物の同期は `dev-scripts/promote-skill.ts` を使う。
- example snapshot の md5 provenance は、実 provider で再生成した場合だけ更新する。
- target workspace を明示する必要がある作業では、暗黙のカレントディレクトリだけに依存しない。
