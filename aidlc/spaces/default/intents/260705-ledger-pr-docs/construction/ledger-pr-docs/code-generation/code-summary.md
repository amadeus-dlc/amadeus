# Code Summary — ledger-pr-docs

上流入力: [business-logic-model.md](../functional-design/business-logic-model.md) / [requirements.md](../../../inception/requirements-analysis/requirements.md)

## 変更したファイル

`docs/amadeus/lifecycle/state.md` の 1 ファイルだけを変更した。
既存の節は変更していない。

## 変更内容

「承認と履歴（audit）」節の直後、「phase 遷移」節の直前に「台帳と PR 断面」節を新設した。
節の内容は次のとおりである。

- `aidlc-state.md` と `audit/audit.md` が追記型の生きた台帳であり、PR の断面ごとに状態を巻き戻さないという原則。
- 各 phase PR / Bolt PR に含めるのは当該 phase / Bolt の成果物ディレクトリだけであり、台帳ファイルは常に最新断面を含むこと。
- resume と検証が特定 PR の断面ではなく台帳全体を読むこと。
- レビューで断面不一致の指摘を受けた場合、本節または Issue #477 へのリンク 1 つで応答し resolve してよいこと。
- PR 説明へ貼れる定型 1 行（コードブロック）。
- 橋渡しは 2 文構成（Phase Progress の自動更新は「phase 遷移」節が正、phase-check 要求は PR #479 で実装済みで「検証」節への文書化は #464 の後続整理）。

## 検証

docs のみの変更であり、コード、テスト、validator の入力には影響しない。
`npm run test:all` の実行は conductor（本作業を統括するエージェント）が別途行う。
本 Intent の作業では、追加した節が business-logic-model.md の節構成（4 点）と挿入位置の根拠に一致することを目視で確認した。
