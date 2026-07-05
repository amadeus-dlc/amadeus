# Business Logic Model — ledger-pr-docs

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更のモデル

docs のみの変更である。`docs/amadeus/lifecycle/state.md` へ「台帳と PR 断面」の節を 1 個追加する（R001）。

節の構成（R002 / R003 の写像）:

1. 原則: aidlc-state.md と audit は追記型の生きた台帳であり、PR の断面ごとに巻き戻さない（org.md の audit 改変禁止と整合）。
2. PR に含める範囲: 各 phase PR / Bolt PR に含めるのは当該 phase / Bolt の成果物であり、台帳ファイルは常に最新断面を含む。
3. 読み方: resume と検証は特定 PR の断面ではなく台帳全体を読む。
4. レビュー応答: 断面不一致の指摘には本節（または #477）へのリンク 1 つで応答し、resolve してよい。PR 説明へ貼れる定型 1 行を併記する。

## 挿入位置

新節は「承認と履歴（audit）」の直後、「phase 遷移」の直前に置く。台帳の性質（audit）を受けて PR 断面の扱いを述べ、その後に phase 遷移の説明へ続く流れが既存構成と整合する（reviewer Low 指摘対応）。

## 断定しない範囲（R004）

Phase Progress の更新方式と phase-check の必須性は #464 で設計判断中のため、「検討中」注記付きの言及に留める。

追補（2026-07-05）: 本設計の作成後、#464 は PR #479 の merge で決着した。
そのため code-generation では「検討中」注記ではなく、merge 後の main の実挙動を正として記載する（R004 の趣旨 = 文書が古くならないこと、に合致。経緯は code-generation-plan.md と memory.md に記録）。
