# Functional Design Questions — reference-plugin-and-guides

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。
>
> E-OC1承認: 質問0件で進行可。承認TS=`2026-07-20T14:36:27Z`。

## 既決事項

- `plugins/test-pro/`をauthoring正本とし、U01 schema、U09 projection、U10 compose/doctor/dropを消費する。新runtime APIは追加しない。
- 必要最小fixtureでauthoring source→6 harness projection→temp host compose→doctor→dropを一つのE2Eとして実証する。
- 宣言成果物だけを生成・検出・除去し、tracked treeへ一時生成物を残さない。
- guideはAmadeus path/namespace、対応面、deferred面、no-clobber、検証手順、6 package/4 self-install差を記載する。
- marketplace、lockfile、agents/scopes/memory/knowledge projection、`when`評価を追加しない。
- U12は全体evidence/ledger集約だけを担う。

[Answer]: 質問0件。leaderのE-OC1承認（`2026-07-20T14:36:27Z`）により上記から機械導出する。test-proの具体slug、文言、fixture pathは公開契約化しない。新runtime API、fixture ownership、no-clobber/drop意味論の追加判断が必要なら停止し、再付議する。

## Ambiguity analysis

- 曖昧回答、矛盾、必要情報の欠落: なし。
- 承認範囲外の具体化: 追加しない。

