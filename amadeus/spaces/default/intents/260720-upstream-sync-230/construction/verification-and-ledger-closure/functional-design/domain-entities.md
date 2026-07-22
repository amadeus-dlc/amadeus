# Domain Entities — verification-and-ledger-closure

> 上流入力(consumes全数): `unit-of-work.md`、`unit-of-work-story-map.md`、`requirements.md`、`components.md`、`component-methods.md`、`services.md`。

## Entity model

```text
UpstreamItem[24] + EvidenceRef[] -> TraceResult
VerificationRun -> VerificationResult
Ledger + CompletionEvidence -> LedgerTransitionResult
```

U12のentityはverification/closure valueで、機能domain modelではない。

## Trace and disposition values

`UpstreamItem`はstable item IDとapproved dispositionを持つ。内部`classifyDisposition`は`VerificationEvidence`から`DispositionVerdict`を返し、EQUIVALENTをcontract全体のcharacterization時だけ認める。

`TraceResult`は24 itemとevidence refsの完全対応を表す。欠落itemを成功状態で表現せず、test/docs種別と証拠位置を保持してU12 verificationへ渡す。

## Verification and completion evidence

`VerificationRun`はtargeted test、filesystem integration test、typecheck、lint、dist、promote-self、full CI、patch coverage、docs検査の実行結果をまとめる。`VerificationResult`は未実施・非0・stale resultをgreenへ変換せず、patch未カバー0または既決waiver証拠を要求する。

`CompletionEvidence`は完全な24 disposition、green必須gate集合、最終比較SHAを運ぶ。三条件の一部だけでcompletionを表さない。

## Ledger transition

`LedgerTransitionResult`はclosed unionとして、未完了/条件欠落による拒否、明示的terminal evidenceによるBLOCKED計画、三条件成立によるAPPLIED計画、既存transition no-opを表す。terminal evidenceのaccepted languageは`verification-failure`と`abandon`だけで、対象SHAと反証可能根拠を持つ。進行中や曖昧自由文をBLOCKEDへ変換しない。

BLOCKEDはbaselineを前進させず、APPLIEDは最終SHAを記録する。どちらも既存atomic writerを使い、同一transition再実行で履歴を増やさない。ledgerは最終operationとしてだけ書かれ、機能成果物のownerにはならない。

## Non-entities

- feature implementation、test対象runtime、deployment resourceはU12 entityではない。
- database、network service、frontend component、AWS resourceは存在しない。
- upstream README/CHANGELOG、roadmap、SKIP testはevidence entityに含めない。

## Upstream input traceability

| Input | Entity設計への実質利用 |
|---|---|
| `unit-of-work.md` | trace/verify/transition valueとclosure-only境界 |
| `unit-of-work-story-map.md` | 24 item/U01–U11 evidenceをU12へ集約 |
| `requirements.md` | EQUIVALENT、FR23/24、三条件、idempotencyをinvariant化 |
| `components.md` | C7 evidence/docs/ledger ownerを固定 |
| `component-methods.md` | 正準引数/返却型と内部helperを使用 |
| `services.md` | batch verification、ledger write最終、DB/networkなし |
