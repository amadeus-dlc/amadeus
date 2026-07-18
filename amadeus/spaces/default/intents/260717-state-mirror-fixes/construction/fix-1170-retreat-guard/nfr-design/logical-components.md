# Logical Components — fix-1170-retreat-guard(nfr-design)

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## 論理構成(実装対象の最終形)

```
amadeus-utility.ts
└─ export function handleSetStatus(projectDir, flags)     # export 化(ADR-5、tech-stack-decisions.md T-2 の既存 import 再利用)
   ├─ 事前検証(die 経路 — 不変、ロック外)
   └─ withAuditLock(projectDir, () => {
        content ← readStateFile                            # ロック内再 read
        cb ← parseCheckboxes(content).find(slug 一致)
        if cb.state ∈ {completed, awaiting-approval}:      # 後退述語(ADR-2)
          stderr advisory; return                          # no-op(business-logic-model)
        setField×6 → setCheckbox → writeStateFile          # 前進(既存処理の移設)
      }, flags.intent, flags.space)
```

- 変更ファイル: packages/framework/core/tools/amadeus-utility.ts のみ(コード面)。amadeus-lib.ts は無変更(parseCheckboxes/withAuditLock を既存のまま消費)
- テスト配置(T-3 の写像、reviewer Finding 1/2 是正 — 一意確定): **handleSetStatus の in-process 駆動テスト(BR-1/2/4/8 — readStateFile/writeStateFile 経由で実 FS 一時ディレクトリに触れる)は tests/integration に配置する**(fs-tests-integration-first: 実 FS を使う検証は最初から integration 層。in-process import のため bun --coverage の計測は spawn 盲点に入らず lcov 有効 — NFR-4 と両立)。並列 spawn 競合テスト(BR-3、t145 様式)も tests/integration。**tests/unit には新設しない**(handleSetStatus は fs 非注入設計のため純関数層のテスト対象が存在しない — parseCheckboxes は既存テストで被覆済み)。upstream functional-design/business-rules.md の「unit:」表記は本節の読み替え(in-process 駆動 = integration 層で実施)を正とする(nfr-design 段での明示解消)
- 配布面: dist 6ツリー+self-install 再生成(tech-stack-decisions.md T-4)
- 依存(T-1 の写像): 新規 runtime dependency ゼロ — 全変更が既存 import(:68/:91)とリポ内シンボルの範囲(reviewer Finding 1 の明示化)

## 変更目録(NFR 設計確定後の導出 — nfr-design:c7)

| 面 | ファイル | 変更 |
|---|---|---|
| コード | packages/framework/core/tools/amadeus-utility.ts | handleSetStatus の export 化+withAuditLock ラップ+後退述語(30-40行) |
| テスト | tests/integration(BR-1/2/4/8 の in-process 駆動+BR-3 の t145 様式拡張 — tests/unit 新設なし、:21 の配置正本に整合) | BR-1〜8 の写像(160-190行) |
| 配布 | dist 6ツリー+self-install | 再生成のみ(手編集なし) |
