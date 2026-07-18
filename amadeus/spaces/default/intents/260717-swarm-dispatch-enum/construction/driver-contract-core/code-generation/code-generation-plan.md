# Code Generation Plan — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `requirements.md`(FR-1/2/4/6/7 の受け入れ)、FD 4成果物(`business-logic-model.md` の16セル決定表・`business-rules.md` BR-1〜8・`domain-entities.md` の型・`frontend-components.md` の CLI 出力契約)、ND 5成果物(`logical-components.md` の部品表・`performance-design.md` PD-1 の純関数構成・`security-design.md` SD-1〜3 の fail-closed 型構成・`scalability-design.md`・`reliability-design.md` RD-1〜4)、`unit-of-work.md` U1。

## 検証方針

検証コマンド列と受け入れは `requirements.md` の FR 受け入れ・`performance-design.md`(I/O 非含有の実装レビュー)・`security-design.md`(rejected 型構成)に従う。

## 実施計画(worktree 隔離 builder — 実績)

1. swarm prepare で bolt-driver-contract-core worktree fork(base = team branch)
2. builder サブエージェントへ c2 隔離・deviation-stop・同期完遂の標準文言付きでディスパッチ
3. 実装対象: `packages/framework/core/tools/amadeus-swarm.ts` 単一(ND logical-components の部品表どおり — 型置換 / resolveDriver / handleResolve / main 第4 case / emit 追随)
4. テスト: `tests/unit/t233-driver-resolution.test.ts` 新規(手書き16セル matrix+in-process negative)+t134 fixture 三値追随
5. dist/self-install 再生成(E-SDE-CG1 裁定 A — 自 diff 分)
6. 検証: typecheck / lint / dist:check / promote:self:check / --ci / patch gate / 落ちる実証 / lcov
