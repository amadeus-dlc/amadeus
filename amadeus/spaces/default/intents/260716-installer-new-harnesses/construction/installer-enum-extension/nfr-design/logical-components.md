# Logical Components — U1 installer-enum-extension(Issue #1048)

上流入力(consumes 全数): `../nfr-requirements/tech-stack-decisions.md`、`../nfr-requirements/performance-requirements.md`、`../nfr-requirements/security-requirements.md`、`../nfr-requirements/scalability-requirements.md`、`../nfr-requirements/reliability-requirements.md`、`../functional-design/business-logic-model.md`(F-1〜F-4)。

## 論理コンポーネント構成(AD C1〜C7 の NFR 面写像)

```
packages/setup(installer — embedded)
├─ domain/harness.ts        … C1: 値集合の正本(brand 型+parse)     [SR-1/RR-1]
├─ domain/engine-layout.ts  … C2: dir 解決(fail-fast map)           [RR-2]
├─ modules/reporter.ts      … C3: 出力契約(usage/invalid)           [挙動保存]
└─ tests(契約2本+install-flow fixture)… C4/C5: 全数性の機械検出  [SC-1]

packages/framework/core(runtime 2面 — embedded、dist 6+self-install 2 へ regen)
├─ tools/amadeus-lib.ts     … C6a: KNOWN_HARNESS_DIRS(rung 2 実挙動)[RR-3]
└─ tools/amadeus-utility.ts … C6b: otherTrees(advisory 表示)        [BR-5]

README(FR-5)… C7: 導線文書(実装と同一 PR)
```

テキストフォールバック: installer 4コンポーネント(C1 値集合正本 / C2 dir 解決 / C3 出力契約 / C4-C5 テスト)+ core 2ツール(C6a lib=rung 2、C6b utility=advisory)+ README(C7)。矢印は依存でなく所属。

## 配置と regen

C6a/C6b の変更は `bun scripts/package.ts`(dist 6ツリー)+`bun run promote:self`(self-install 2ツリー)で計8ミラーへ同期(dist:check / promote:self:check で検証 — tech-stack-decisions.md)。
