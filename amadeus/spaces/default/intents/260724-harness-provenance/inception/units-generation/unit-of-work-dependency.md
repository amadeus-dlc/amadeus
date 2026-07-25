# Unit of Work Dependency — 260724-harness-provenance

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md, stories.md

## 依存トポロジー(what can depend on what)

canonical unit name `harness-provenance`（表示名: Harness Provenance、ID: U1）だけで構成し、他ユニットへの依存はない。components.md と component-methods.md が定義する Harness Recorder と Harness Detector は、同一 deployable Unit 内で `handleIntentBirthStateBuild() → detectHarnessType(): HarnessType → resolveHarnessDir()` の呼出方向を持つ内部契約として連携する。services.md が示す同一プロセス内同期呼出(独立サービスは N/A)もユニット間 edge ではなく内部契約として保持する。

本ステージは実装順序・critical path を決めない(それは delivery-planning = stage 2.8 の責務)。以下は「何が何に依存しうるか」の記述に留める。

## parseBoltDag 用 YAML edge block

```yaml
units:
  - name: harness-provenance
    depends_on: []
```

## 依存図

```
harness-provenance (U1 / Harness Provenance)
├── amadeus-lib.ts: HarnessDirResolution / resolver / HarnessType / canonical map / detector
├── amadeus-utility.ts: handleIntentBirthStateBuild() から呼出
├── tests: resolver unit + 6 distribution-path integration + memory-template regression
├── docs/reference/: AMADEUS_HARNESS_TYPE
└── dist/self-install: package + promote
```

## 単一ユニット化の根拠

- requirements.md の FR-1〜FR-4 と stories.md の利用シナリオは、検出から state 記録までを一つの利用者価値としている
- unit 内の正本ファイルは複数だが、いずれか片方だけでは deployable な利用シナリオを満たさない
- decisions.md の単一パス設計と component-dependency.md の同期呼出契約を維持しつつ、1 Unit = 1 Bolt = 1 PR の境界を成立させる
- decisions.md ADR-5のprovenance resolverとAC-3dの配布時呼出経路は、DetectorとRecorderを跨ぐ同一受入境界であり、別Unitへ分けない
- dist 再生成は正本変更をまとめて1回実行し、全ハーネス配布面のドリフトを同じ Bolt で検査する
