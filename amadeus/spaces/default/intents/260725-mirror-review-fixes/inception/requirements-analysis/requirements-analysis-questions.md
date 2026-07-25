# Requirements Analysis — 明確化質問

回答方式: Guide me（ユーザー回答 `1`）

**ユーザー承認**: 2026-07-25T03:21:30Z — Q1〜Q3の統合要約を確認し、要件生成を承認。

## 上流参照と質問化の境界

本質問票は、directiveが権威あるconsumeとして渡したbrownfieldの`business-overview`、`architecture`、`code-structure`だけを上流入力とし、ユーザー回答を意思決定根拠として記録する。

実測で確定している coverage source 正規化漏れ、設定読み込みの TOCTOU、state codec の未エスケープ C0 制御文字受理、および「各欠陥に再現テストを先行させる」「巨大ファイル分割と gateway lexer 共通化は別 intent」という境界は質問化しない。以下は、互換性と公開 CLI 契約に関する真の未決事項だけである。

## Q1. lifecycle CLI の成功終了条件

`boundary` / `manual` の呼び出し結果が未完了でも exit 0 になる現状を、どの契約へ変更するか。

- A. `completed` のみ exit 0 とし、`ask`、`pending`、`safety-blocked`、`suppressed` は安定した診断とともに非 0 を返す（推奨）
- B. `completed` と意図的な `suppressed`（例: mode off）は exit 0 とし、`ask`、`pending`、`safety-blocked` のみ非 0 にする。ただし `suppressed` では receipt を完了扱いにしない
- C. exit code は現状維持し、呼び出し側だけが outcome を解析して receipt 完了可否を決める
- X. Other (please specify)

[Answer]: A — `completed` のみ exit 0（ユーザー回答: `推奨`、2026-07-25T03:08:55Z）

## Q2. prompt 回答の公開 CLI

保存済み `expectedPrompt.bindingId` と approve/skip 回答を一致させる公開経路を、どこに設けるか。

- A. lifecycle CLI に `answer approve|skip --binding-id <id>` を追加する。`ask` outcome は `bindingId` を返し、approve/skip の両方で保存済み binding と一致しなければ fail-closed にする（推奨）
- B. lifecycle CLI には追加せず、orchestrator の `ask` / `report --user-input` 往復だけを正規回答経路にする
- C. lifecycle CLI から prompt mode を利用できないようにし、manual/auto のみを許可する
- X. Other (please specify)

[Answer]: A — lifecycle CLI に `answer approve|skip --binding-id <id>` を追加し、両回答で保存済み binding との一致を必須化（ユーザー回答: `推奨`、2026-07-25T03:10:28Z）

## Q3. legacy mutation verb の扱い

既存の `amadeus-mirror.ts create|sync|close` が lifecycle の permit、receipt、provenance、repair/close guard を迂回する問題を、互換性を含めてどう解消するか。

- A. verb 名は維持し、内部実装を lifecycle `manual` 経路へ委譲する。再試行可能な `--instance` を必須化し、直接 GitHub mutation 実装は廃止する（推奨）
- B. mutation 3 verb を明示的に拒否し、read-only の `status` だけを残す。利用者には lifecycle CLI への移行を求める
- C. legacy 実装を残し、permit、receipt、provenance、repair/close guard を重複実装する
- X. Other (please specify)

[Answer]: A — verb 名は維持し、内部実装を lifecycle `manual` 経路へ委譲する。`--instance` 必須化による呼び出し形式の破壊的変更は、安全な再試行識別のため許容する（ユーザー回答: `推奨`、2026-07-25T03:12:15Z）
