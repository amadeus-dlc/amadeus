# 技術スタック決定 — U1 harness-capability-matrix

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 依存追加ゼロ・Bun 単独

technology-stack の実測所見「`git diff --name-only 1673c4332..HEAD -- package.json bun.lock` は出力 0 件」「新規外部パッケージもゼロ」「plugin 機構のために runtime dependency を追加せず、Bun/TypeScript と既存 manifest/FS API で実装する」を本 Unit の技術決定として継承する。requirements の NFR-3(Bun-only、配布フレームワークへの runtime dependency 追加禁止)と一致する。

U1 はコードを搬送しない(business-logic-model の deployable 境界どおり record 文書 PR)ため、そもそも新規の実行時コード・依存を導入しない。プローブ実施に用いるのは Bun 直接実行の既存ツールと標準的なシェルコマンド(ファイル直読・既存 CLI 起動)に限る。

- 決定: 新規 runtime dependency を追加しない(合否: `package.json` / `bun.lock` の diff が U1 由来で 0 件)
- 決定: プローブは Bun + 標準ツールのみで実施し、外部ライブラリを導入しない

## 成果物形式の決定

business-rules の BR-U1-1〜7 が要求するのは Markdown record 文書(能力マトリクス+ProbeRecord)であり、technology-stack の既存様式(record は version-controlled Markdown)に閉じる。新規のデータ形式・生成器・台帳を発明しない(requirements NFR-4 の count-free / 単一正本原則)。

- 決定: 成果物は既存 record 文書様式の Markdown とし、新規スキーマ・生成ツールを作らない
