# Business Logic Model — u001-journal-logger

## 上流入力

[requirements.md](../../../inception/requirements-analysis/requirements.md)、[unit-of-work.md](../../../inception/units-generation/unit-of-work.md)、[unit-of-work-story-map.md](../../../inception/units-generation/unit-of-work-story-map.md)。

## 実装パイプライン（B001、bolt-plan の順序）

1. **FR-1 契約 doc**: amadeus/spaces/default/journal/README.md。節構成 = 目的と位置づけ（第三の置き場）/ ファイル規約（日次 <YYMMDD>.md）/ エントリ形式（見出し + 4 フィールドの雛形と実例）/ 種別語彙（調停・委任・体制・観察）と拡張手順 1 行 / 追記専用規律（昇格スタンプ追記のみ例外）/ 参照方向の規約 / 昇格スタンプ記法。
2. **FR-2 validator TDD**: 既存 eval（dev-scripts/evals/amadeus-validator/check.ts）へ journal ケース（正しい journal = FR-4 実データのコピー + fail 変異 3 種）を追加し、既存 validator が journal を検査しないことで fail 変異が素通りする RED を確認 → AmadeusValidator.ts の checkSpaceLayers() へ checkJournal（optional 扱い = 存在時のみ最小 3 条件）を実装 → GREEN → promote --replace → test:it:promote-skill / test:it:amadeus-validator（既存チェーンに編入済み）。
3. **FR-4 #556 移行**: 本文 + コメント 3 件を journal/260706.md へ形式変換（記録日ファイル、各エントリに「#556 から移行」出自 + 発信者 = leader）。この実データが eval fixture の「正しい journal」の実体になる。
4. **FR-3 手順書 + prompt**: amadeus/spaces/default/knowledge/journal-logger-runbook.md（worktree 準備 / agmsg join・spawn 手順 = spawn.sh 引数の実測記載 / 日次 draft PR 手順 / 不達時 fallback）+ 役割 prompt 全文（受信 → 整形追記 → ack 固定形式（アンカー付き）→ 仕分け 3 分類の提案同梱 / 定着決定権なし / 軽量モデル指定）。
5. **FR-5 チェックリスト**: knowledge/journal-logger-verification-checklist.md（受け入れ条件 2〜3 の合否基準、人間 / leader の記入欄）。
6. **検証**: git add 後に test:all / validator（Intent 指定込み）/ 新 eval / promote eval。

## 配置の確定

| 成果物 | path |
|---|---|
| 契約 doc | amadeus/spaces/default/journal/README.md |
| 移行データ | amadeus/spaces/default/journal/260706.md |
| 手順書 | amadeus/spaces/default/knowledge/journal-logger-runbook.md |
| チェックリスト | amadeus/spaces/default/knowledge/journal-logger-verification-checklist.md |
| validator | skills/amadeus-validator/validator/AmadeusValidator.ts の checkSpaceLayers()（正準）→ promote → .agents/skills/... |
| eval | dev-scripts/evals/amadeus-validator/check.ts へ journal ケース追加（test:it:amadeus-validator = 既存チェーン編入済み、新規 package.json 行不要） |

注: 手順書とチェックリストは knowledge/ に置く（questions Q3 = A。FR-2.1 の閉列挙 = README.md と <YYMMDD>.md のみ、を承認どおり維持）。journal/README.md から両文書へリンクする。

## エラーハンドリング

- eval: 既存 amadeus-validator eval の隔離 workspace 規律（成功・失敗どちらでも片付け）に従う。spawn.sh の実測は「スクリプト本文と usage の読解」であり実行はしない（C-1）。
- 移行変換で形式に収まらない原文（自由記述の長文）は本文フィールドへ整形し、原文の完全性は #556 リンクで担保（出自明記）。
