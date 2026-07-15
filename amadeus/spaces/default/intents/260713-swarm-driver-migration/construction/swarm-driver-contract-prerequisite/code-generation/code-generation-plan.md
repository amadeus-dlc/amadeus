# U-04 prerequisite コード生成計画

## 目的と承認

U-04 `codex-native-driver` を実装可能にするため、U-01/U-02が所有するprovider-neutral contractへ次の3 seamを追加する。

1. C-08がCodexのversioned mode identifier `codex-ultra-v1:<resolved-model-id>` と `resolvedModelId` の完全相関を検証できること。
2. probeでsealしたseed/final digestをselected checkpointからnative executionへ再伝達し、tool environment / sandbox policy digestとともにprovider arm前のcheckpointへ保存できること。
3. application designの共通契約どおり、すべてのnative candidateへ候補総45秒を渡すこと。

ユーザーの「当該PRを出すところまで推奨選択で進めろ」を、このprerequisiteの計画承認およびPR作成までの推奨判断委任として扱う。U-04、U-03、U-05のproduction adapter実装は本変更に含めない。

## Interface設計

### ProbeBindingReferenceV1

`ProbeResult`へoptionalなredacted referenceを1件だけ追加する。

```ts
type ProbeBindingReferenceV1 = Readonly<{
  schemaVersion: 1;
  driver: NativeDriver;
  modeIdentifier: string;
  resolvedModelId?: string;
  seedDigest: string;
  finalDigest: string;
}>;
```

- unavailable/error probeはbindingを持てない。
- digestは64文字lowercase hexへ限定する。
- native selectionではbindingのdriver / modeIdentifierとselected driver / probeを一致させる。
- Codex bindingではresolvedModelIdを必須とし、`modeIdentifier === "codex-ultra-v1:" + resolvedModelId`を要求する。
- selection projection、checkpoint parse、resume reconstructionで同じclosed schemaを使う。
- provider固有catalog/config/hook payloadやcredentialはcommon contractへ出さない。

### NativeExecutionBinding

`AdapterExecutionPlan`へoptionalなbindingを1件追加する。

```ts
type NativeExecutionBinding = Readonly<{
  schemaVersion: 1;
  probeBinding: ProbeBindingReferenceV1;
  toolEnvironmentPolicyDigest: string;
  sandboxPolicyDigest: string;
}>;
```

- `probeBinding`は`LaunchInput.plan.probe.binding`と完全一致する。
- `PreparedNativeRun`へ同じimmutable bindingを保存し、`onResourcesPrepared`後・provider arm前にcheckpointする。
- bindingを使わない既存providerはfieldを省略できる。
- U-02はdigestの相関と永続性だけを所有し、Codex model/catalog/envの意味はU-04 adapter内に隠す。

### Evidence mode policy

- Claude/Kiroは従来どおりexact literal一致。
- Codexだけは`modeIdentifier === "codex-ultra-v1:" + resolvedModelId`を要求する。
- legacy `codex-ultra`、resolved model欠落、空suffix、不一致を拒否する。

### Probe budget policy

- 全native candidateの共通上限: 45,000ms。
- Codex adapterはこの総budget内で5/10/30秒のstep ceilingを所有する。
- `ProbeInput.timeoutMs` interfaceは変更せず、runtimeの単一共通定数だけを更新する。

## TDD実装手順

- [x] **Step 1: ProbeBinding contractをRED→GREENにする。** `t223-swarm-driver-contract.test.ts`へbuild、immutable round-trip、driver/mode mismatch、unavailable binding、digest形式、unknown/secret field拒否を1件ずつ追加し、foundation / contractの最小変更で通す。
- [x] **Step 2: versioned Codex modeをRED→GREENにする。** `t229-swarm-driver-evidence.pbt.test.ts`のhappy pathをversioned modeへ変更し、legacy、missing、mismatch、emptyを追加してC-08 policyを最小変更する。
- [x] **Step 3: probe budgetをRED→GREENにする。** `t231-swarm-driver-runtime.test.ts`からcoordinator resolveを通し、adapterへ共通45,000msとprojectDir / batch / environmentが渡るobservable behaviorを固定する。
- [x] **Step 4: pre-arm checkpoint transportをRED→GREENにする。** native executionのpublic callback / persisted checkpointを通し、probe bindingとtool-env / sandbox digestがarm前に保存され、mismatch / partial bindingがfail-closedになるcaseを`t237`、`t242`または`t243`のowner testへ縦切り追加する。
- [x] **Step 5: 回帰とcoverageを閉じる。** `t223`、`t229`、`t231`、`t237`〜`t243`、typecheck、lint、coverage registry、project coverage gate、dist/promote driftを実行する。
- [x] **Step 6: 独立レビューを最大2 iteration実施する。** public interfaceの深さ、secret surface、checkpoint相関、Claude/Kiro互換性、C-11差分0件を確認する。
- [x] **Step 7: PRを作成する。** 英語Conventional Commitでcommitし、`codex/swarm-driver-integration` baseへ日本語タイトル/本文でPRを作る。mergeは行わない。
- [ ] **Step 8: PRを収束させる。** `j5ik2o:gh-pr-converge-loop`を使い、mergeability→review threads→全checksの順で確認し、push後は先頭から再評価する。

## 変更予定面

| 所有 | ファイル |
|---|---|
| U-01 contract | `amadeus-swarm-driver-foundation.ts`、`amadeus-swarm-driver-contract.ts`、`amadeus-swarm-driver-adapter-contract.ts` |
| U-02 lifecycle/runtime | `amadeus-swarm-driver-lifecycle.ts`、`amadeus-swarm-driver-runtime.ts`、`amadeus-swarm-native-execution.ts` |
| tests | 既存`t223`、`t229`、`t231`、必要最小限の`t237`〜`t243` |
| AIDLC record | 本計画、`code-summary.md`、`memory.md`、audit shard |

## 非目標と逸脱ガード

- C-11、selector順序、fallback policy、driver literal、registration cardinalityを変更しない。
- Codex/Claude/Kiro production adapter、hook、harness packagingを実装しない。
- provider固有payload、model slug、env名、credentialをcommon checkpointへ保存しない。
- ProbeBinding専用supervisor、provider別checkpoint union、parallel storage surfaceを追加しない。
- 既存test番号を使い、新しい`t244`以降を消費しない。
- `main`向けPRを作らず、Codexはmergeしない。

## 成功条件

1. 3契約差分がpublic interface越しのtestでgreenになる。
2. bindingなしの既存Claude/Kiro adapterとfloor/legacy pathが無変更でgreenになる。
3. tampered binding、policy digest、Codex mode/model相関がfail-closedになる。
4. C-11 source差分0件、production provider adapter差分0件。
5. integration向けPRが作成され、全required checksがgreenになる。
