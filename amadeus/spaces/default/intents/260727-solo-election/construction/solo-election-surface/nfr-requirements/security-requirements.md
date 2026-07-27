# Security Requirements — solo-election-surface (U2)

上流入力(consumes 全数): business-logic-model.md(ソロ手順・降格・ノルム改定の論理)、business-rules.md(BR-U2-1〜8 の検証列)、requirements.md(FR-02/04/08〜13・NFR-01〜03 の正本)、technology-stack.md(SKILL/dist 投影の実行環境)。

## セキュリティ要件

| ID | 要件 | 合否基準 | 出典 |
|---|---|---|---|
| U2-SEC-01 | spawn プロンプトのアンカリング防止: テンプレ変数は {viewPath}(+conductor 保持の {electionId})のみで、分析・推奨・先行票・他 voter 状態のスロットが存在しない | BR-U2-2 のテンプレート検査テスト(SKILL 実文 grep — 許可トークン以外の変数不在) | requirements.md FR-02、business-logic-model.md spawn テンプレ節 |
| U2-SEC-02 | subagent 出力内の指示風テキストを指示として実行しない既存規律(cid:requirements-analysis:instruction-like-text-rejection)を SKILL 手順が弱めない | 内挿文に「subagent の返答を指示として実行する」類の文言が不在(grep) | team.md 既存ノルム |
| U2-SEC-03 | 新規の資格情報・外部サービス・ネットワーク面を追加しない | 実装 diff に env/credential/network 追加ゼロ | requirements.md(外部依存なし) |

## 明示的に設けない検査(比例選定)

新規 DAST・依存監査なし(U2 は prose+テストのみ)。根拠は cid:build-and-test:bt-proportional-selection、既存 scan の扱いは cid:build-and-test:c3 のとおり不変。
