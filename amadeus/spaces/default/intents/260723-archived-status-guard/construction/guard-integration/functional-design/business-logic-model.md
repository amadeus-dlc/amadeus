# Business Logic Model — guard-integration

上流入力は `unit-of-work`、`unit-of-work-story-map`、`requirements`、`components`、`component-methods`、`services`。本UnitはFR-05〜FR-07とNFR-04のprimary ownerであり、Bolt 1のstrict statusとBolt 2のpreflight/lifecycle CLIを消費する。

Integration spot-check `GUARD-INTEGRATION-PRIMARY-1`: 共通guard正本は `packages/framework/core/tools/amadeus-lib.ts`。

## Shared rejection flow

各入口は`withIntentLifecyclePreflight`のcallback内で対象を解決し、recovery後のstatusだけを読む。対象不在とarchived拒否は別variantにし、共通dataから各toolの既存public shapeへrenderする。

```ts
type IntentOperationRejection =
  | {
      kind: "intent-not-found";
      selector: string;
      operation: "select" | "next" | "unpark";
      reason: string;
      recovery: readonly string[];
    }
  | {
      kind: "intent-archived";
      intentDir: string;
      status: "archived";
      operation: "select" | "next" | "unpark";
      recovery: string;
    };
```

statusが`archived`なら副作用前にrejectionを返す。他のstatusは既存処理へ委譲し、通常のpark/unpark、complete、selection semanticsを変更しない。

## Selector flow

1. preflight lock取得とjournal recovery。
2. intent name、record-dir、既存selector形式を同じresolverで一意解決する。
3. 対象不在なら`intent-not-found`をCLI non-zero errorへrenderする。
4. strict statusが`archived`なら`intent-archived`をCLI non-zero errorへrenderする。
5. 許可statusならcallback内でactive cursorをatomic writeする。

`--force`、`--unarchive`、read-only selectionなどの迂回optionは追加しない。archivedを読む一覧・履歴操作は対象外であり、cursor設定操作だけを拒否する。

## Next flow

1. `next`の最初のworkspace accessをpreflightで包む。
2. active cursorを解決する。legacy/manual editでarchivedを指していてもstatusをstrict readする。
3. archivedなら`kind: "error"` directiveを返し、stage resolution、checkbox変更、audit event生成へ進まない。
4. 許可statusなら既存のdirective resolutionを続ける。

`archivedNextGuard(projectDir)`は共通rejectionを`{ kind: "error", message: renderArchivedRejection(error) }`へ写像する。`handleNext`はinit/status等の非workflow command分岐後、stage graph解決・directive構築・state/audit mutationより前にこのguardを呼び、返値があればJSONをstdoutへ一度だけ書いて即returnする。後続のrun-stage/ask/print resolutionへfall throughしない。

error messageは対象intent、status、operation=`next`、具体的な`intent unarchive <resolved-dirName>`を含む。拒否前後でstate、registry、cursor、audit bytesを比較する。

## Unpark flow

1. state verbのworkspace lock/preflight内で対象statusを読む。
2. archivedならpark markerの有無を調べる前、または少なくとも変更前にCLI non-zero errorで拒否する。
3. 許可statusなら既存unpark処理を続ける。

archived + parkedとarchived + unparkedの両fixtureを拒否し、statusを`in-flight`へ戻さずmarkerを削除しない。

## Utility delegation

`intent archive <selector>` / `intent unarchive <selector>`はutility preflight内でselectorをdirNameへ解決する。utilityはlockを解放してからstate subprocessを起動し、stdout、stderr、exit codeを変更せず返す。state subprocessは新しいpreflight lockを取得し、dirName存在、status、journal、human-presenceを再検証する。

utilityの解決結果は権限証明ではない。解決後に対象が変化・消失した場合はstate側の観測を正としてsafe rejectionし、utility側で再試行や補正をしない。

## Corpus and falling proofs

repositoryからactive cursor writer、stage directive開始点、unpark marker writer、status writerのcallsiteをdiscoverする。各callerが共通preflightまたは限定transition capabilityへ到達することをassertし、手書きallowlistだけに依存しない。

falling proofは修正前に赤、修正後に緑となるselector、stale cursor `next`、unparkの3系統を持つ。各testは目的分岐のcoverageと副作用対象bytesを確認する。

corpus testは`packages/framework/core/tools/**/*.ts`をsource rootとし、TypeScript ASTで次のsinkへのcallsiteを抽出する: active cursor write/delete、`emitRunStageForSlug`相当のstage directive生成、unpark marker mutation、registry status write。named import、re-export、direct wrapper callをsymbol解決してpublic CLI root（utility/orchestrate/stateのsubcommand handler）まで逆向きに辿り、各pathにpreflight/guardまたは限定transition capabilityが存在することを要求する。computed property、dynamic import、解決不能alias、未分類sinkがあればfail-closedにする。

harnessとself-installはcoreからの生成物なので別の手書きcall graphを正本にせず、package生成後のdist/self-install drift guardと禁止旧pattern scanで同期を検証する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:40:07Z
- **Iteration:** 1
- **Scope decision:** none

guard順序とTOCTOU再検証は概ね妥当だが、typed rejection、next短絡return、corpus証明、復旧command具体化が未閉鎖。

### Findings

- MAJOR — intent-not-found variantのreason必須性を成果物間で統一する。
- MAJOR — next ErrorDirective写像とcaller短絡return位置を定義する。
- MAJOR — corpus検査のroot/sink/alias/generated面/fail-closedを定義する。
- MINOR — recovery commandをresolved dirName入りの実行可能文字列にする。

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-07-23T08:41:57Z
- **Iteration:** 2
- **Scope decision:** none

Iteration 1の4指摘は解消された。typed rejection、next短絡、具体的復旧command、AST corpus検査が確定し、追加設計判断なしで実装可能。

### Findings

- RESOLVED — intent-not-found必須fieldを統一。
- RESOLVED — archivedNextGuardのErrorDirective写像とhandleNext即returnを確定。
- RESOLVED — AST/symbol graph corpus検査とfail-closed条件を確定。
- RESOLVED — resolved dirName入りunarchive commandを生成。
