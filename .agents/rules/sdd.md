# SDD Rules

このルールは、Spec-Driven Development の成果物を作るときに適用する。

## 対象

- cc-sdd / Kiro 系: `.kiro/specs/*`

## 言語

- 仕様書、設計書、タスク、調査メモ、検証レポートは、最初の生成から日本語で書く。
- 英語で下書きしてから日本語へ翻訳しない。翻訳調の不自然な日本語や、ドメイン語彙のズレが入りやすいため。
- `spec.json` に `language` がある Kiro 系 spec では、`language: "ja"` を前提に requirements / design / tasks を日本語で生成する。

## Kiro 系の基準

- cc-sdd / Kiro 系を使う。`$kiro-*` には品質ゲート用のコマンドがあり、requirements / design / tasks / implementation の各段階でハルシネーション対策をしやすいため。
- cc-sdd / Kiro 系を選ぶ目安は、実装タスク分解、複数ファイル変更、設計判断、既存実装との整合確認、段階的な検証が必要な場合。
- 迷った場合は cc-sdd / Kiro 系を選ぶ。品質ゲートを通せる workflow を優先する。
- cc-sdd / Kiro 系を選んだ場合は、`$kiro-spec-status` で状態を確認し、必要に応じて `$kiro-validate-gap`、`$kiro-validate-design`、`$kiro-validate-impl` を使って品質ゲートを通す。

## 生成前チェック

- 同じ系統の既存成果物と、隣接 feature だけを読み、同じ語彙、見出し粒度、タスク分割に合わせる。
- 新しい spec を作る前に、対象範囲と責任境界を明確にする。
- 大きな機能は、単一の巨大 spec にせず、独立して実装・レビューできる単位へ分割する。

## レビューゲート

- `requirements.md` と `tasks.md` を生成・変更した場合は、完了前に `thermo-nuclear-code-quality-review` でレビューする。
- レビューでは、要求やタスクが実装時に巨大ファイル、場当たり的な分岐、責務の混線、不要な抽象を誘発しないかを確認する。
- レビューで構造的な問題が見つかった場合は、文書を小さな feature / task へ分解してから完了扱いにする。

## Kiro 系の注意

- `.kiro/specs/<feature>/requirements.md`、`design.md`、`tasks.md` は日本語で書く。
- `tasks.md` は実装者がそのまま進められる粒度にする。抽象的な「適切に実装する」だけのタスクを作らない。
- 既存 spec の `spec.json.language` が `ja` でない場合は、勝手に翻訳・変更せず、人間に確認する。

## 禁止事項

- 英語で生成した requirements / design / tasks を後から機械的に日本語へ置換する。
- 英語の一般論をそのまま持ち込み、既存の日本語ドメイン語彙とずれた spec を作る。
- 以下は`cc-sdd`の配布物なので人間の許可なく変更しないでください 
  - `CC-SDD-CLAUDE.md`, `CC-SDD-CODEX.md`, `.kiro/settings`, `.agents/skills/kiro-*`, `.codex/skills/kiro-*`, `.claude/skills/kiro-*`
