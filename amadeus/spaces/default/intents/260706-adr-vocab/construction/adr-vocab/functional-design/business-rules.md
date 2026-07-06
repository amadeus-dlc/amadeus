# Business Rules — adr-vocab

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 語彙と判断記録の規則

- BR-1: 語彙の正準は CONTEXT.md の 1 箇所とし、glossary.md は抜粋として独自定義を持たない（Q1 = (a) 改良版、requirements gate で人間確定済み）。抜粋が正準とずれた場合は CONTEXT.md を正として glossary を直す。
- BR-2: CONTEXT.md への語彙追加は `.agents/rules/context.md` の追加基準（プロジェクト固有概念のみ。一般技術語・ファイル名・単発ラベルは追加しない）で選別する。棚卸し 8 候補は gate で人間が絞り込める形（候補 + 根拠 + 出典）で提示する。
- BR-3: 既存語彙の名称補正（Aidlc State → Amadeus State 等）では概念と定義本文を維持し、名称・パス表記だけを現行化する。定義の意味を変える場合は補正ではなく語彙更新として扱い、根拠を添える。
- BR-4: 判断記録の現行の置き場は Intent record の decision + grilling trail + steering 根拠表 + CONTEXT.md（語彙）とし、ADR の移設は「判断の要旨 + git 履歴参照」で行う。全文複製・新規 ADR 体系の再建はしない。

## 退役と参照更新の規則

- BR-5: docs/adr は互換 stub・リダイレクトなしで削除する（backward-compatibility ルール。維持対象は docs/backward-compatibility.md 記載分のみで、docs/adr は記載がない）。`adr-template.md`（`.agents/amadeus/knowledge/amadeus-architect-agent/`）は Intent record 内テンプレートであり対象外。
- BR-6: 参照更新の完全性は横断 grep で検証する。除外は (1) `amadeus/spaces/*/intents/`（record 内の歴史的言及）(2) git 履歴参照として意図的に残す記述（移設先の経緯参照）に限る。
- BR-7: README.md / README.ja.md と docs/amadeus/lifecycle/overview.md の編集は、engineer5（guide-intro / docs-i18n）との接触面ピア確認（先勝ち + 追従）の回答後に行う。回答が期限内に来ない場合は編集を後回しにし、他の変更から進める。
- BR-8: `amadeus-domain-modeling` skill の変更は source（`skills/`）を正として編集し、`dev-scripts/promote-skill.ts --replace` で昇格、`npm run test:it:promote-skill` で検証する。SKILL.md は英語必須（skill language policy）。「CONTEXT.md を更新しない」という skill の既存制約は維持する。
- BR-9: lifecycle/overview.md への追記は既存の言語状態（日本語のみ・.ja.md 併置なし）に合わせて日本語で行い、英語化は docs-i18n 側の責務として持ち込まない。extension-guide への追記は英語正 + .ja.md 併置の既存方針に従い両方書く。
