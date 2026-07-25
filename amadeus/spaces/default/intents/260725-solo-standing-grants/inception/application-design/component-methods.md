# Component Methods: Solo Standing Grant

## Design Inputs

method契約は`requirements.md`、現行`architecture.md`、`component-inventory.md`、`team-practices.md`に基づく。署名は実装境界を固定する高位契約であり、内部helper名はConstructionで既存styleへ合わせて調整できる。

## Standing Grant Ledger Domain

```ts
type StandingGrant = {
  readonly grantId: string;
  readonly scope: "stage-gates";
  readonly issuedAtMs: number;
  readonly expiresAtMs: number;
  readonly includesPhaseBoundary: boolean;
  readonly issuerIntent: string;
  readonly issuerShard: string;
  readonly issuerHumanTs: string;
  isExpired(nowMs: number): boolean;
};

type StandingGrantInvalidReason =
  | "not-found"
  | "ambiguous-id"
  | "malformed"
  | "expired"
  | "revoked"
  | "intent-mismatch"
  | "invalid-provenance"
  | "gate-out-of-scope";

type StandingGrantValidation =
  | { readonly kind: "valid"; readonly grant: StandingGrant }
  | { readonly kind: "invalid"; readonly reason: StandingGrantInvalidReason };
```

```ts
type StandingGrantRouteReceipt = {
  readonly routeId: string;
  readonly stage: string;
  readonly grantId: string;
  readonly timestamp: string;
};
```

```ts
findSoloStandingGrant(
  projectDir: string,
  intent: string,
  slug: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
): StandingGrant | null
```

- active intent内で発行された候補だけを読む
- whole-spaceの取消eventを適用する
- expiry降順、発行監査時刻降順、Grant Id辞書順昇順で完全順序化する
- team modeの`findActiveStandingGrant`の探索順序は変更しない

```ts
validateSoloStandingGrantById(
  projectDir: string,
  intent: string,
  grantId: string,
  slug: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
): StandingGrantValidation
```

- ID一致する発行eventをexact lookupし、0件または複数件をfail-closedにする
- route時の候補選択を再実行せず、指定IDだけをexpiry、revocation、intent、provenance、gate scopeについて評価する
- 新しく優先度の高いgrantが発行されても指定IDを差し替えない

```ts
findStandingGrantRouteReceiptById(
  projectDir: string,
  routeId: string,
): { readonly intent: string; readonly receipt: StandingGrantRouteReceipt } | null
```

- space内の全intent・全shardから`Route Id`完全一致の`GATE_AUTHORIZATION_SELECTED`を探す
- route appendとcommitは既存workspace-level intent registry lock内でlookupし、同一Route Idのcross-intent追加を判定後へ割り込ませない
- exactly oneのreceipt所有intentをtransaction targetとして返し、report開始後のactive-intent cursorに置換しない
- 0件、複数件、stage不一致、Grant Id不一致はfail-closed
- receiptはimmutable route factであり「最新」「未解決」「消費済み」を推測しない
- crash後のstale receiptは、対応Route Idを持つreportだけが参照できる
- concurrent routeはそれぞれ別Route Idを持ち、後発receiptが先発carrierを無効化しない

## Directive Contract

```ts
interface RunStageDirective {
  // existing fields unchanged
  standing_grant_id?: string;
  standing_grant_route_id?: string;
}

interface AwaitApprovalDirective {
  kind: "await-approval";
  stage: string;
  reason: "standing-grant-no-longer-authorizes";
}
```

validation規則:

- `standing_grant_id`は8桁の小文字hex、`standing_grant_route_id`はUUID v4
- 2fieldはall-or-none。片方だけならinvalid
- `run-stage`以外へ同fieldを付けるとunknown-key拒否
- `await-approval`は上記3field以外を拒否
- malformed directiveはemit前にfail-closed

## Gate Router and Report Transport

```ts
attachSoloStandingGrant(
  directive: RunStageDirective,
  projectDir: string,
  stateContent: string,
  graph: StageEntry[],
  nowMs: number,
): RunStageDirective
```

- canonical resolverが`solo`を返し、`directive.gate === true`のときだけqueryする。invalid modeはfail-closed
- phase boundary、walking skeleton、per-unit未完了ではdomain判定によりIDを付けない
- per-unitはall-covered再entryの最終gate directiveだけが対象
- carrierをemitする前にUUID v4 Route Idを生成し、workspace outer lock内でspace-wide未使用を確認してからprotected `GATE_AUTHORIZATION_SELECTED`を`Stage`、`Grant Id`、`Route Id`付きで記録する。記録成功後だけ同じpairをemitし、衝突時はduplicateを作らずfatalにする

```ts
interface ReportFlags {
  // existing fields unchanged
  standingGrantId?: string;
  standingGrantRouteId?: string;
}
```

`parseReportFlags`は`--standing-grant-id <id>`と`--standing-grant-route-id <uuid>`をall-or-noneで取り込み、`approveArgs`が`amadeus-state.ts approve`へ同じpairをverbatimで渡す。

## Approval Transaction

```ts
type ApprovalCommitOutcome =
  | { readonly kind: "approved" }
  | {
      readonly kind: "await-approval";
      readonly stage: string;
      readonly reason: "standing-grant-no-longer-authorizes";
    };

approveUnderLock(
  projectDir: string,
  slug: string,
  userInput: string | undefined,
  standingGrantId: string | undefined,
  standingGrantRouteId: string | undefined,
): ApprovalCommitOutcome
```

処理順序:

1. workspace-level intent registry lockをouter lockとして取得し、Route Idをspace内の全intentからexact lookupする。exactly oneのreceipt所有intentをtransaction targetへpinし、transaction完了までouter lockを保持する。新しくactiveになったintentは読取・fallback・audit・state mutationの対象にしない。
2. workspace → owner intentの順でtargetのaudit/state lockを取得し、state、stage、artifact、scopeを既存どおり検証する。
3. `standingGrantId`がなければ、既存human/team authorizationをbyte-for-byte同じ順序で実行する。
4. carrier pairがあればcanonical modeがsoloであることを確認し、target lock内でreceiptとstage/Grant Idを照合する。
5. receipt一致時だけtarget intentに対して`validateSoloStandingGrantById`を実行する。
6. receipt不一致またはgrant invalidならapproval audit/state mutationより前に`await-approval`を返す。
7. validならGrant Idを`ApprovalAuthorization`へ入れ、target intentの既存approval transactionを続行する。

grant invalidはexpected outcomeであるため、例外、`error()`、stderr、非zero exitを使わない。真正のartifact欠落、state不整合、I/O failureは既存fatal error契約を維持する。

`GATE_AUTHORIZATION_SELECTED`はprotected eventへ追加し、一般`amadeus-audit append`からのmintを拒否する。Standing grantの正本は引き続き`GRANT_ISSUED` / `GRANT_REVOKED`であり、route receiptは認可相関だけを記録する。

## Grant-backed Approve Wire Contract

新flag pairを持つ`amadeus-state.ts approve`だけが次のstrict wireを使う。human/teamの既存approve stdout/stderrは変更しない。

```ts
type GrantApprovalWireOutcome =
  | { readonly kind: "approved" }
  | {
      readonly kind: "await-approval";
      readonly stage: string;
      readonly reason: "standing-grant-no-longer-authorizes";
    };
```

| Outcome | Exit | stdout | stderr |
|---|---:|---|---|
| grant commit成功 | 0 | 上記`approved` JSONを正確に1行 | 空 |
| expected fallback | 0 | 上記`await-approval` JSONを正確に1行 | 空 |
| protocol/state/I/O error | non-zero | 契約対象外 | 既存fatal diagnostic |

`amadeus-orchestrate.ts report`がwire parserとdirective変換を所有する。grant flag pairを渡した場合、exit 0でもstdoutが空、複数行、非JSON、unknown key/kind、schema不一致なら真正protocol errorとしてfail-closedの`error` directiveへ変換する。`await-approval`だけをnon-error directiveへ変換し、`approved`だけを既存`done`へ進める。補助logをstdoutへ混在させない。

## Operating Mode Resolver

```ts
type OperatingModeResult =
  | { readonly kind: "valid"; readonly mode: "solo" | "team" }
  | { readonly kind: "invalid"; readonly raw: string };

resolveOperatingMode(raw: string | undefined): OperatingModeResult
```

未設定/空と`solo`はsolo、`team`はteam、それ以外はinvalid。発行、取消、route、commitが同じ関数を利用する。

## Grant Lifecycle Verbs

```text
grant-standing-delegation [--scope stage-gates] [--ttl-ms <n>] [--include-phase-boundary]
revoke-standing-delegation --grant-id <8-hex id>
```

mode guardだけをsoloでも許可するよう拡張し、fresh `HUMAN_TURN`、provenance、TTL、scope、protected-event mint、取消追記の既存contractは維持する。team branchの出力、event field、default TTLは変更しない。

## Harness Contract

```text
run-stage.standing_grant_id present
  -> full stage ritual
  -> report --stage <slug> --result approved
       --standing-grant-id <exact-id>
       --standing-grant-route-id <exact-route-id>

report returns await-approval
  -> stage body/reviewer/sensors/learningsを再実行しない
  -> standard human approval prompt
  -> report --stage <slug> --result approved --user-input <exact-human-reply>
```
