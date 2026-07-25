# Units Generation Questions — 260724-harness-provenance

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md, stories.md

以下は application-design の成果物(components.md の3コンポーネント、component-dependency.md の依存図)からの直接導出であり、新規の価値判断を含まない。requirements.md の FR-1〜FR-4 と stories.md の単一利用シナリオを end-to-end で出荷できる境界へ是正した。cid:requirements-analysis:no-election-judgment-gate に基づき選挙不要判定を leader へ申告のうえ承認を得た。承認: leader が承認しました(2026-07-24T12:51:05Z)。

## Q1. ユニット境界戦略は?

[Answer]: A — 2026-07-24T17:07:06Z のユーザー確認により、検出から記録・配布検証までを一つの deployable feature Unit とする

- A. 機能凝集(by feature)で統合。components.md の Component 1(Harness Detector)・Component 2(Harness Recorder)・Component 3(Field Reuse)を、検出から state 記録までの一つの deployable feature Unit に含める。docs 反映(ADR-2)と dist/self-install 検証も同じ Unit の Definition of Done に含める
- X. Other

## Q2. ユニット粒度は?

[Answer]: A — 単一ユニット。Delivery Planning で walking skeleton と Bolt/PR 境界の矛盾が判明したため、ユーザー確認のうえ旧2ユニットを統合（2026-07-24T17:07:06Z、Mode: Guide me）。Application Design再承認後も境界は不変で、規模だけ約130〜160行へ更新

- A. 粗粒度(1ユニット)。本 intent は総計約130〜160行のM規模であり、検出だけでは利用者価値を出荷できない。canonical unit `harness-provenance`（U1 / Harness Provenance）へ、provenance付きresolver+検出関数+型+canonical mapping+state.md 埋込+memory.md 通常エントリの運用受入証跡+docs+単体/全6配布形態統合テスト+dist を含める
- X. Other

## Q3. 依存順序は?

[Answer]: A — 外部ユニット依存なし

- A. 単一 U1 は外部ユニットに依存しない。component-dependency.md の `handleIntentBirthStateBuild → detectHarnessType` は U1 内部の実装順序・関数契約として維持する
- X. Other

## Q4. ユニット間の契約は?

[Answer]: A — ユニット内の内部契約

- A. 内部`resolveHarnessDir()`がprovenanceを`detectHarnessType(): HarnessType`へ渡し、その結果をRecorderへ渡す。既存`harnessDir(): string`の公開互換性は単一U1内で維持する(component-methods.md・ADR-5で確定済み)
- X. Other

## Q5. デプロイモデルは?

[Answer]: A

- A. 単一配布(monolithic)。単一U1で `packages/framework/core/tools/` の正本を編集し、`bun scripts/package.ts` で全 dist ツリーへ再生成(team-practices.md の Way of Working)。独立デプロイはしない
- X. Other

補足: services.md が独立サービス層を N/A(同一プロセス内同期呼出のみ)と結論しているため、独立デプロイ可能なサービス境界は存在せず、単一配布が唯一の整合的なデプロイモデルである。
