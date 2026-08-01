# Domain Entities — u5-ci-all-models-measure

**Intent**: 260801-tla-multi-model / **Stage**: functional-design / **Unit**: u5-ci-all-models-measure(C6+C9+C10)

上流入力(consumes 全数): unit-of-work(u5 節), unit-of-work-story-map(FR→Unit 写像 — FR-4 / FR-5 の u5 帰属), components(C6 / C9), decisions(ADR-4 / ADR-8 / ADR-10), business-logic-model.md(本 Unit 同ステージ §2〜§8), business-rules.md(同), 実測ソース(ci-model-check-domain.ts 全文, ci-model-check-runner.ts 全文, node-ci-model-check-port.ts 全文, run-model-check-diagnostic.ts :56-88)

本ファイルは本 Unit が新設・拡張する3つのドメイン概念を定義する。既存 entity(CiModelCheckRunEvidence / CiAcceptanceEvidence / CiAcceptanceRunRequest / DiagnosticResult)は再定義せず、拡差分のみを示す。全フィールド readonly / readonly 配列で不変とする(既存 ci-model-check-domain.ts の流儀踏襲 — 同ファイル :7-30 は既に readonly 流儀だが、拡張で新設する型は**全て厳格な readonly**に統一する)。

## 1. CiModelRun — 1 モデル × 1 run の実行単位

CI 反復の最小単位。runner がモデル外側ループ × run マトリクス内側で生成する一意キーを持つ(BLM §2.2)。

```ts
export type CiVerificationLayer = "frozen" | "verified-source";

export interface CiModelTarget {
  readonly name: string;                    // model-map 登録名(map models 配列宣言順の一意名)
  readonly modelPath: string;               // specs/tla/<Name>.tla(loader verified source 由来)
  readonly cfgPath: string;                 // specs/tla/<Name>.cfg(同上)
  readonly layer: CiVerificationLayer;      // frozen = FormalElection(ADR-10) / verified-source = それ以外(D-U5-1)
}

export interface CiModelRun {
  readonly model: CiModelTarget;
  readonly kind: "warm-up" | "measured";    // 既存 CiRunKind 不変
  readonly index: number;                   // warm-up=0, measured=1..5(マトリクス不変)
  readonly artifactDirectory: string;       // `${model.name}/runs/${kind}-${index}`(evidenceRoot 相対)
}
```

- **一意キー**: `(model.name, kind, index)`。runner の失敗短絡レコード(run-failure.json)にも `model` を載せ、どのモデルのどの run で落ちたかを証跡化する(BLM §2.2)。
- **layer の決定規則**: 宣言的性質のみで決まる(モデルが frozen binding を持つか)。実行時の成否で layer が切り替わる経路は存在しない(fail-closed、BLM §3.2)。`layer` の導出は port / runner 内の1関数に集約し、判定を複製しない(BR-E4 と同じ単一実装の精神)。
- **不変条件**: `index` と `kind` の対応(warm-up ⇔ 0)は既存マトリクス(ci-model-check-runner.ts:93-100)をそのまま pin する。`artifactDirectory` は canonical 相対パス(ci-model-check-artifacts.ts containedPath の検査対象)で、バックスラッシュ・`..`・絶対パスを含まない。

## 2. ModelTlcEvidence — per-model の TLC 計測証跡

各 run の `tlc-stdout.bin` から `extractDiagnosticStatistics`(共有、BR-E4)で抽出した完全探索証跡。`CiModelCheckRunEvidence` へ `model` とともに追加するフィールド(BLM §2.3 / §3.4)。

```ts
export interface ModelTlcEvidence {
  readonly model: string;                       // run のモデル名(CiModelRun.model.name と一致)
  readonly completionMarker: boolean;           // "Model checking completed. No error has been found." 出現
  readonly generatedStates: number | null;      // 抽出失敗時 null(verification では measured run 非 null を要求)
  readonly distinctStates: number | null;
  readonly statesLeftOnQueue: number | null;    // 完全探索時は 0
  readonly searchDepth: number | null;
}
```

- **既存型との関係**: `extractDiagnosticStatistics` の戻り(run-model-check-diagnostic.ts:56-62 の DiagnosticStatistics)と同じ情報だが、completion marker は文字列リテラルではなく boolean 正規化して持つ(CI evidence は「出た/出ない」の判定のみを証跡化し、生文字列は tlc-stdout.bin 側に残す)。変換は diagnostic 側の既知の変換点1箇所で行う。
- **pin 対象**(BR-E2 / BR-E3): MirrorLifecycle の **measured** run では generatedStates = 208,628 / distinctStates = 89,099 / searchDepth = 18 / statesLeftOnQueue = 0 / completionMarker = true の完全一致。warm-up は completionMarker のみ。
- **evidence への載格**: `CiModelCheckRunEvidence` に `readonly model: string` と `readonly stats: ModelTlcEvidence` を追加する拡張。acceptance.json のスキーマ名は据え置き(`amadeus.ci-model-check-acceptance.v1`、BR-F2)。配列長は `6 × モデル数`、順序は map 宣言順 × run index 順(BLM §2.3)。
- **層によらない一様性**: frozen 層(FormalElection)でも同じ形で統計を載せる。層の非対称は verdict 経路(DETECTED vs marker 判定)のみであり、証跡形状は対称(BLM §3.4)。

## 3. TimeoutEscalation — 時間不整合の検出・証跡・裁定要求

30 分ジョブ timeout との不整合を「設計を緩めずにエスカレーションする」ための記録型(BLM §8、BR-T1/T2)。コード上の新規 export を強制するものではなく、record / code-summary に書く証跡の形を定義する概念 entity である(実装側で構造化が必要になった場合のみ、この形のまま JSON 化する)。

```ts
export interface TimeoutEscalation {
  readonly detectedBy: "diagnostic-local" | "ci-estimate" | "ci-actual";
  // diagnostic-local = ローカル事前計測で 1 run が port 予算超過
  // ci-estimate      = 6 run 総量見積りが 30 分に収まらない
  // ci-actual        = CI 実走で timeout 打ち切り
  readonly model: string;
  readonly measurements: {
    readonly perRunElapsedMs: readonly number[];   // 採取済み各 run の実測
    readonly portRunBudgetMs: 190_000;             // 現行 port 予算(BLM §3.4、緩和禁止の対象)
    readonly jobTimeoutMinutes: 30;                // ci.yml:513(変更禁止、BR-C1)
    readonly abortedAt: string | null;             // ci-actual の場合の打ち切り位置(run 識別子)、それ以外 null
  };
  readonly ruling: "requirements-re-ruling-required"; // time-box 後続裁定への送付(FE Q1=A)
}
```

- **ライフサイクル**: detected → measurements 証跡化(record 固定)→ ruling 送付(要件再裁定)。本 Unit の中で「緩和して閉じる」状態遷移は**存在しない**(BR-T1)。
- **不変条件**: `portRunBudgetMs` / `jobTimeoutMinutes` はリテラル固定値であり、escalation の記録それ自体がこれらを変更する力を持たない。time-box 化(探索深さ・worker 数・マトリクス制限)が採択された場合は、成功 (i)(完全探索)の定義との整合を要件レベルで再審した上で、**別の裁定結果として**本型とは別に記録される(ADR-8 Consequences)。

## 4. 既存 entity との関係(拡張の最小性)

- `CiAcceptanceRunRequest` への追加は `readonly model: CiModelTarget` の1フィールドのみ(ci-model-check-runner.ts:26-31 の既存形を壊さない)。
- `DiagnosticResult` への追加は `readonly model: string` の1フィールドのみ(schema 名据え置き、BLM §4)。
- `CiTerminalInputs` / `resolveCiTerminalState` の exit code マッピング semantics は**不変**(モデル次元は terminal 判定に現れない — 失敗は run 段階で短絡済み)。
- 上記いずれの拡張も、既存フィールドの型・名前・順序を変更しない(NFR-1: 既存 consumer はフィールド追加のみで追随できる)。
