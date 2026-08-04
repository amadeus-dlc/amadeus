# Intent Capture — 明確化質問

Intent: `260803-harness-live-e2e`  
入力正本: [Issue #1717](https://github.com/amadeus-dlc/amadeus/issues/1717)  
回答モード: Guide me

> **既決照合（E-OC1）**: ユーザーは前段で「Issue #1717をそのまま実装Intent化する」を選択した。Issue本文には課題、対象者、成功条件、起動理由、段階展開、非目標が明記されているため、既決事項を再質問しない。真に未決の実装・設計判断は後続ステージで扱う。

## Q1: 解決する課題は何か？

- A. live E2E の安全ポリシーとライフサイクルが Codex helper に集中し、他ハーネスでは同じ保証を再利用できない
- B. Codex CLI 自体の機能不足
- C. 通常CIの実行速度不足
- D. 全ハーネスの transport 不統一
- E. モデル出力の完全一致不足
- X. その他

[Answer]: A（E-OC1 既決照合 — Issue #1717「要旨」「背景」）

## Q2: 誰のどのペインを解消するか？

- A. Amadeus のハーネス保守者と各ハーネス利用者 — 実CLI・実モデルの検証保証がハーネスごとに分散・欠落し、配布面の変更を安全に確認しづらい
- B. Codex CLI 利用者だけ
- C. GitHub Actions 管理者だけ
- D. アプリケーションの非開発ユーザー
- E. モデルプロバイダー
- X. その他

[Answer]: A（E-OC1 既決照合 — Issue #1717「現状」「運用サイクル」）

## Q3: 成功をどう測るか？

- A. Issue #1717 の受け入れ条件を満たし、共通contract、Codex/Claude Code、Kimi/Kiro系、Cursor/OpenCodeの各段階で adapter 実装または根拠付き後続Issueへの接続を完了する
- B. Claude Code adapter の追加だけで完了する
- C. Cursor の調査だけで完了する
- D. 全transportを一つへ統一する
- E. live E2Eを通常のGitHub Actionsで常時実行する
- X. その他

[Answer]: A（E-OC1 既決照合 — Issue #1717「段階的ロールアウト」「受け入れ条件」「非目標」）

## Q4: このイニシアチブのトリガーは何か？

- A. Codexで成立したlive E2E保証を横展開し、他ハーネスのGHA deny・認証隔離・skip reason・実行記録の欠落や分散を解消する必要が顕在化した
- B. 規制対応
- C. 市場競合への緊急対応
- D. 課金コストだけの削減
- E. UI刷新
- X. その他

[Answer]: A（E-OC1 既決照合 — Issue #1717「背景」「由来と文脈」）

## 合意サマリ確認

- A. 上記の抽出内容で確定し、Intent Statement と Stakeholder Map を生成する
- B. 内容を修正してから生成する
- X. その他

[Answer]: A（ユーザー直接裁定 2026-08-03T08:07:45Z — Guide me の合意サマリ確認で「1」を選択）

## 回答分析

- 既決4項目の間に矛盾はない。
- transportの統一は非目標であり、共通化対象はpolicy/lifecycleに限定する。
- Phase 1〜3の全体を同一Intentで追跡する。Phaseごとの実装分割は許容する。
- 未決のadapter interface、台帳配置、各CLI capabilityは後続の要件・設計・実測で確定する。

## §13: 次回への追加事項

- A. 追加なし
- X. 自由記述で追加する

[Answer]: A（ユーザー直接裁定 2026-08-03T08:12:17Z — 「1」を選択）
