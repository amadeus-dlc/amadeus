上流入力(consumes 全数): intent-statement

# Feasibility Assessment — 260725-kimi-harness

## 結論

**GO(条件なし)**。Kimi Code CLI への amadeus 移植は技術的に実現可能であり、既存の移植手順・資産・実機環境がすべて揃っている。

## 技術的実現性の根拠

intent-statement で設定された成功指標(5件)に対する実現性評価:

1. **移植手順が確立済み**: `docs/harness-engineering/09-porting-to-a-new-harness.md` の手順どおり、packager(`scripts/package.ts`)は `packages/framework/harness/<name>/manifest.ts` を自動検出する。新ハーネスは「1ディレクトリ + manifest 1行 + 列挙更新」で載る構造が `scripts/manifest-types.ts:79-122` で確認済み
2. **Kimi の hook 契約が Claude 互換**: 公式 docs 実測で、stdin JSON(`hook_event_name`/`session_id`/`cwd`/`tool_input`)・exit 0/2・`hookSpecificOutput` は Claude 型と同型。core hooks(Claude 型 stdin を正常形とする)は adapter 1本で載る。既存ハーネスのうち Claude Code に最も近い
3. **ネイティブ検出が使える**: `.kimi-code/skills/`・`.kimi-code/agents/` は Kimi のプロジェクトレベル自動検出パス(docs + バイナリ文字列実測)。このセッション自体がプロジェクトの `.agents/skills/amadeus/*` を40本以上ロードして動作している実証がある
4. **harnessDir は `.kimi-code` で確定**: 現行 en docs・0.28.1 バイナリ実測(`.kimi-code` 60箇所、`.kimi` はレガシー移行元 `sourceHome` のみ)・このマシンの実在の3系統で一致。ja ヘルプページの `~/.kimi` 記述は旧 kimi-cli 時代のもので誤り
5. **実機環境が揃っている**: kimi 0.28.1 がインストール済み。live 配線テスト(Q1=A)と probe+journey のクレジット消費(Q2=A)はユーザー承認済み

## 主要な技術的不確実性(実装中に潰す)

- hook payload の正確なフィールド名(SessionStart の source 相当、SubagentStop の agent 識別子、TodoList の `tool_input` 形状 → TaskUpdate 変換)。docs はベース形のみ記載 — **live capture で潰す**(Q1 許可済み)
- Stop block の stdout 契約(プレーンテキスト vs `hookSpecificOutput`)と SessionStart の context 注入形式 — 同上
- `.kimi-code/agents/` の自動検出は docs + バイナリ文字列で確認済みだが、実機では未検証(ペルソナ .md が custom agent として実際に dispatch 可能かを dogfood で確認)

## リスク分析(要約)

詳細は raid-log.md。最大のリスクは Kimi の fast-moving な仕様変更(0.19→0.29 が約1ヶ月)で、fail-open adapter・doctor の機能 probe・実測バージョンフロア(Q3=A)の3層で吸収する。

## AWS / コンプライアンス観点

support agents(aws-platform / compliance)の観点: AWS サービス・アカウントは一切関与しない(CLI ハーネス移植のため N/A)。規制要件(PCI/HIPAA/SOC2/データレジデンシー)も該当しない。唯一の境界はユーザーグローバル config への書き込みで、team.md P4 に従い明示承認・バックアップ・マーカー・除去手順を制約レジスタに登録した(constraint-register.md 参照)。
