# Security Requirements — leader-sync-tool(U1)

上流入力(consumes 全数): requirements, business-logic-model, business-rules, technology-stack — 攻撃面は business-logic-model.md のエラー経路、実行系は technology-stack.md の Bun/TS 構成、境界は requirements.md NFR-1 に依拠。認証委譲・spawn 様式の正本は consumes 外の一次資料(project.md の gh-scripts-boundary 規範/application-design services.md)にあり、下記 S-1/S-2 で出典明示のうえ引用する(reviewer 指摘で出典訂正)

## 要求

- S-1: 認証情報を保持しない — gh keyring 委譲のみ(出典: project.md gh-scripts-boundary「認証は gh keyring へ委譲しトークンを持たない」+AD services.md。requirements.md NFR-1 の境界と整合、ハードコード禁止は construction ガードレール)。
- S-2: no-shell spawn(出典: AD services.md「すべて no-shell の spawnSync(env: process.env 明示)」— シェル注入面なし。business-logic-model.md は port 実行の順序のみを定めるため spawn 様式の正本は services.md)。
- S-3: 入力境界は自 repo の git/FS のみ(外部ユーザー入力なし)— business-rules.md BR-1/BR-9 の read-only+2クラス限定が書込面を封鎖。
- S-4: 監査整合 — 生成 PR は人間レビュー+承認マージ(BR-3)で、tool 単独では main へ到達不能(P4 整合)。

## 検証

新規スキャン不要(build-and-test:c3 — 攻撃面・依存の変更なし)。S-2/S-3 は実装レビュー観点+t 系テストの spawn 引数 assert で担保。
