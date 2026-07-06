# 業務ルール — unit: parallel-policy-docs

requirements.md の制約節と functional-design-questions.md の確定回答を、判定可能なルールに落とす。

## 記述ルール（全 WF 共通）

- 「実装済み」と記す項目は、実装箇所の参照（ファイルパスまたは文書の節名）を必ず添える（N001）。
- 並行運用ポリシーへの追記は「観察済みの実例に根拠がある範囲」に限定し、推測の判断基準を足さない（policy 自身の原則）。
- 既存の見出し体系・語彙・粒度に合わせる。新しい見出し体系を作る場合は理由を diary に記録する。
- 日本語で書く。機械可読ラベル（イベント名、コマンド名、ファイル名）は英語のまま使う。

## 変更範囲ルール

- 変更してよいのは文書のみ: `aidlc/spaces/default/memory/team.md`、`aidlc/spaces/default/memory/phases/construction.md`、本 Intent record 配下。
- エンジンコード・skill・validator・example・CONTEXT.md・docs/adr に触れない。
- team.md の他の節（org.md 上書き関係、変更種別、判断基準の既存行）は改変しない。追記と、追記に必要な最小限の接続だけを行う。

## gate evidence ルール（WF1、R006-1）

- PR gate 運用の gate evidence は「Bolt PR の merge」と「`BOLT_COMPLETED`」の 2 点のまま変えない。
- `WORKTREE_*` / `STATE_*` / `AUDIT_*` を gate evidence へ追加要求しない。エンジン内部 attestation として位置づける。

## disposition ルール（WF4、R005）

- 判定は 3 値で記録する: `実装済み`（参照付き）/ `本 Intent で文書化`（節名付き）/ `未確定・運用実績待ち`。
- close 提案には判定表と根拠を添え、close 操作は Maintainer に委ねる。

## 検証ルール

| 対象 | 検証 |
|---|---|
| repo 全体 | `npm run test:all`（N002） |
| Intent 成果物構造 | `AmadeusValidator . 260705-parallel-policy-docs`（N003） |
| AC-1 | 成果物内の「#407 5 項目 → 節」対応表の存在と、各節の実在 |
