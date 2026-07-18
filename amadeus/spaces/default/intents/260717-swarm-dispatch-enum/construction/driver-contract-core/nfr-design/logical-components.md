# Logical Components — driver-contract-core(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `performance-requirements.md`、`security-requirements.md`、`scalability-requirements.md`、`reliability-requirements.md`、`tech-stack-decisions.md`、`business-logic-model.md`。

## 論理構成(amadeus-swarm.ts 内)

| 部品 | 種別 | 内容 |
|---|---|---|
| 型定義群 | type/const | DriverName / DRIVER_VALUES / HarnessName / HARNESS_VALUES / DriverResolution(export — in-process seam) |
| resolveDriver | 純関数(export) | 決定表の実装(`business-logic-model.md` 16 セル) |
| handleResolve | CLI ハンドラ(export — seam-export-handler-amend) | env 読み → resolveDriver → stdout JSON / stderr+exit 1 |
| main switch 第4 case | 配線 | `resolve` サブコマンド dispatch(ADR-2) |
| emitSwarmDegraded 追随 | 既存修正 | requested: DriverName(三値)へ型追随、:291 Fallback 固定維持 |

## 配置

- 実装: `packages/framework/core/tools/amadeus-swarm.ts`(単一ファイル — TSD-2)
- テスト: tests/unit(純関数 matrix/negative — fs 非接触)+必要時 tests/integration(実 FS)— fs-tests-integration-first 2軸
