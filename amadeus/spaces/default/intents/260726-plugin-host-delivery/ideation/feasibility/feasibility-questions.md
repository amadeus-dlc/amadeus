# Feasibility 質問 — plugin-host-delivery

> 上流入力(consumes 全数): intent-statement
> 回答方式: ソロモード・ユーザー直接回答(AskUserQuestion、選挙不要 — 人間本人の裁定)。
> 承認: 【裁定待ち】

> 事前整理(feasibility:c1 — 外部前提はユーザーに問わず実ツールで検証済み/検証中のため質問しない):
> - 上流 v2.3.0 の機構・参照実例・適合テスト 32 ケースは commit `29a31f78` の一次資料を直読済み(intent-statement の参照リンク)
> - 現行 Amadeus のプラグイン基盤(package.ts / compose engine / formal-model-check / フック配線 / doctor)とハーネス面(フック機構・self-install ツリー)はリポジトリ実測スキャンで確定する
> - 規制・コンプライアンス要件: 該当なし(OSS 開発フレームワーク、外部データ処理なし)。trust 境界はプラグイン機構自体の設計対象として requirements/design で扱う

## Q1. 対象ハーネスに Kimi Code を含めるか?

旧 Issue #1543(2026-07-26 起票)は 6 ハーネス(Claude Code / Codex / Cursor / Kiro CLI / Kiro IDE / OpenCode)を列挙するが、同日以前に Kimi Code ハーネスが main へ着地済み(#1522)。Issue の「現在の Amadeus パッケージ面を全数評価する」の趣旨に従うと Kimi も対象になる。

- A. 含める — 「全数」の趣旨を優先し、能力マトリクス・packaging・適合テストの対象を 7 ハーネスとする
- B. 含めない — Issue 列挙の 6 ハーネスに固定し、Kimi は後続 intent で追加する
- C. マトリクス(調査)のみ 7 番目として含め、実装・テストの対象化は調査結果を見て再判断する
- X. その他(自由記述)

[Answer]: A(ユーザー直接回答 2026-07-26T14:25Z 頃 — 「全数」の趣旨を優先し 7 ハーネス対象)

## 裁定の記録

- Q1 = A(7 ハーネス対象)。ユーザー直接回答 2026-07-26T14:25Z 頃(AskUserQuestion)— ソロモード・選挙不要(人間本人の裁定)。承認: 同時刻(1問様式の required-sections H2 floor 対応、cid:requirements-analysis:eoc1-evidence-in-questions-header 追補準拠)
