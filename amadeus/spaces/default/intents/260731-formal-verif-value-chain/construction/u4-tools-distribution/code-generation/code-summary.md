# Code Summary — u4-tools-distribution

上流入力(consumes 全数): unit-of-work, functional-design, nfr-design, bolt-plan

## 実装結果(bolt-u4-tools-distribution ブランチ、conductor へ --no-ff マージ済み `709e20e60`)

- manifest `tools` フィールド+parseTools+composeWriteSet/ownedPaths/digest 対称拡張+drop 対称+`compose --all-harnesses`(コミット `0bf95eae0`)、bulk compose の seed-failure 分岐の落ちる実証(`3a67649e8`)。
- テスト: `tests/unit/t379-plugin-tools-distribution.test.ts`+`tests/integration/t379-plugin-tools-distribution.integration.test.ts` — conductor 引き取り再実測 **42 pass / 0 fail**(既存 t379-swarm-canonical-emit 同居分含む)。
- 共通ゲート(typecheck/lint/dist:check/promote:self:check)全 exit 0。swarm check converged ✓。
- **再接地統合(conductor)**: origin/main の #1877(drop→compose scope セル保存)・#1873(compose 時 Stage Progress resync)と u4 の bulk compose が amadeus-plugin.ts で交差 — 4 ブロックを union 解消(composed variant へ `resynced` を統合、bulk 経路も per-tree resync を継承)。typecheck 0 で型整合確定、dist 再生成同期。
- 統合検証: 再接地後フルスイート **RESULT: PASS(fail 0)**。
- 補足: builder は検証ループ滞留のため c5/disk-evidence 引き取り。テスト番号 t379 は既存 t379-swarm-canonical-emit と番号同居(既知の生態 — 引用はフルパスで行う)。
