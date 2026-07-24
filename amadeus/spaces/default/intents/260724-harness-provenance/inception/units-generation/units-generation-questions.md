# Units Generation Questions — 260724-harness-provenance

上流入力(consumes 全数): components.md, component-methods.md, services.md, component-dependency.md, decisions.md, requirements.md, stories.md

以下は application-design の成果物(components.md の3コンポーネント、component-dependency.md の依存図)からの直接導出であり、新規の価値判断を含まない。cid:requirements-analysis:no-election-judgment-gate に基づき選挙不要判定を leader へ申告のうえ承認を得た。承認: leader が承認しました(2026-07-24T12:51:05Z)。

## Q1. ユニット境界戦略は?

[Answer]: A

- A. 機能凝集(by feature)で分割。components.md の Component 1(Harness Detector = 検出ロジック、`amadeus-lib.ts`)と Component 2(Harness Recorder = state.md 埋込、`amadeus-utility.ts`)を単位とする。Component 3(Field Reuse)は既存ヘルパー再利用で新規実装なしのため独立ユニットにしない。docs 反映(ADR-2)は Recorder ユニットに含める
- X. Other

## Q2. ユニット粒度は?

[Answer]: A

- A. 粗粒度(2ユニット)。本 intent は総計数十行規模(decisions.md ADR-4)であり、過度な細分化は統合コストを増やすだけ。U1=Harness Detector(検出関数+型+定数+単体テスト)、U2=Harness Recorder(state.md 埋込+docs+統合テスト)の2ユニット
- X. Other

## Q3. 依存順序は?

[Answer]: A

- A. U2(Recorder)は U1(Detector)の `detectHarnessType()` に依存する(component-dependency.md の依存図: `handleIntentBirthStateBuild → detectHarnessType`)。よって U1 → U2 の直列依存。U1 は既存 `harnessDir()`/`KNOWN_HARNESS_DIRS` にのみ依存し、他ユニットに依存しない
- X. Other

## Q4. ユニット間の契約は?

[Answer]: A

- A. U1 が公開する `detectHarnessType(): HarnessType` と `HarnessType` 型が U1→U2 の契約(component-methods.md で確定済み)。U2 はこの関数を呼ぶだけで、U1 の内部実装に依存しない(狭い公開 API)
- X. Other

## Q5. デプロイモデルは?

[Answer]: A

- A. 単一配布(monolithic)。両ユニットとも `packages/framework/core/tools/` の正本を編集し、`bun scripts/package.ts` で全 dist ツリーへ再生成(team-practices.md の Way of Working)。独立デプロイはしない
- X. Other

補足: services.md が独立サービス層を N/A(同一プロセス内同期呼出のみ)と結論しているため、独立デプロイ可能なサービス境界は存在せず、単一配布が唯一の整合的なデプロイモデルである。
