# Scope Definition — 明確化質問

Intent: `260803-harness-live-e2e`  
上流成果物: `ideation/intent-capture/intent-statement.md`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
回答モード: Guide me

> **既決照合（E-OC1）**: Intent Statement と Issue #1717 は、Phase 1〜3 の完了境界、Must/Should、依存順序、段階展開、非目標を既に定義している。これらは再質問せず、期限制約だけを確認する。

## Q1: 最小価値スライスは何か？

- A. 共通 policy/lifecycle seam を抽出し、Codex の既存保証を維持したうえで Claude Code の最小 live status journey を成立させる
- B. Claude Code adapter だけを単独追加する
- C. Cursor と OpenCode の capability spike だけを行う
- D. 全ハーネスを一括移行する
- X. その他

[Answer]: A（E-OC1 既決照合 — Intent Statement「Initial Scope Signal」、Issue #1717「Phase 1」）

## Q2: Must-have と段階完了条件は何か？

- A. Phase 1〜3をIntent範囲とし、各対象はadapter/live journeyを実装するか、阻害要因・推奨seam・受け入れ条件を持つ後続Issueへ接続する
- B. Phase 1だけをMust-haveとし、Phase 2〜3は本Intentから除外する
- C. 全対象でadapter実装のみを完了条件とし、後続Issueへの接続は認めない
- D. capability matrixと運用契約はNice-to-haveとする
- X. その他

[Answer]: A（E-OC1 既決照合 — Intent Statement「Success Metrics」「Initial Scope Signal」、Issue #1717「段階的ロールアウト」）

## Q3: 能力間の依存関係は何か？

- A. 共通contractとCodex回帰防止を先に固定し、Claude Codeでseamを実証してからKimi/Kiro系、最後にCursor/OpenCodeの実測へ進む
- B. 各ハーネスを依存関係なしで同時実装する
- C. Cursor/OpenCodeの実測を最初に行い、共通contractは最後に決める
- D. capability matrixだけを先に完成させる
- X. その他

[Answer]: A（E-OC1 既決照合 — Issue #1717「Phase 1〜3」「依存関係・関連Issue」）

## Q4: 優先順位付けと実装順序は何か？

- A. 依存関係優先を基本とし、安全契約のリスクを先に潰す。Phase内は検証可能な縦スライスへ分割できる
- B. 利用者数だけを基準に価値優先で並べる
- C. 実装難易度の低い順に並べる
- D. 一つのPRで全ハーネスを移行する
- X. その他

[Answer]: A（E-OC1 既決照合 — Intent Statement「Initial Scope Signal」、Issue #1717「段階的ロールアウト」「非目標」）

## Q5: 外部の期限制約はあるか？

- A. 特定日への期限は設けず、安全契約と依存順序を優先する（推奨）
- B. Phase 1のみ期限がある
- C. Phase 1〜3すべてに共通期限がある
- D. ハーネスごとに個別期限がある
- X. その他

[Answer]: A（ユーザー直接裁定 2026-08-03T08:23:07Z — Guide me で「1」を選択）

## 合意サマリ確認

- A. 回答内容でScope DocumentとIntent Backlogを生成する
- B. 内容を修正してから生成する
- X. その他

[Answer]: A（ユーザー直接裁定 2026-08-03T08:24:38Z — 合意サマリ確認で「1」を選択）

## 回答分析

- Phase 1〜3の完了境界、依存関係優先の実装順序、期限制約なしの間に矛盾はない。
- 外部期限によるscope圧縮は不要であり、各Phaseは検証可能な縦スライスへ分割する。
- ハーネス固有能力が不足する場合は、根拠付き後続Issueへの接続を段階完了として認める。
- transport統一、通常GitHub Actionsでのlive実行、モデル出力の完全一致は範囲外を維持する。

## §13: 次回への追加事項

- A. 追加なし
- B. ルール候補を追加する
- C. センサー候補を追加する
- X. その他

[Answer]: A（ユーザー直接裁定 2026-08-03T09:27:05Z — 「1」を選択。選挙E-HLE-SDS13は0件で可を2–0、GoA 1×2で確立）
