# Architecture Decisions — live E2E Phase 2

## 入力

決定は [requirements.md](../requirements-analysis/requirements.md)、[architecture.md](../../../../../codekb/amadeus/architecture.md)、[component-inventory.md](../../../../../codekb/amadeus/component-inventory.md)、[application-design-questions.md](application-design-questions.md) に追跡する。

## ADR-01: transport別`LiveAdapter`で接続する

### Context

共通kernelは`LiveAdapter`と`runLiveJourney`を既に提供する。Kimi print、Kiro ACP、Kiro TUIは起動・認証・終了・anchorが異なる一方、gate、env隔離、cleanup barrier、outcome、ledgerは同じ契約を必要とする（FR-01〜FR-20、NFR-04/05）。

### Decision

`kimi-print`、`kiro-acp`、`kiro-tui`を独立adapter IDとし、各adapterが既存`LiveAdapter`を実装する。common kernelへCLI別switchを追加しない。Kiro ACP/TUI間の共有helperは、同一変更理由と同じ安全契約が実装で実証された場合だけ後から抽出する。

### Consequences

- transport固有failure/cleanupを局所化できる。
- adapter数は増えるが、capability matrixとcontract testが同じ形で適用できる。
- Kiro二面で一部重複が生じても、誤った共通化より変更影響を限定できる。

### Security and compliance

adapterごとのenvironment declarationとcredential resourceを明示できる。規制対象dataは扱わないが、secret/source path非永続化を全adapterで同じcontractとして検証する。

### Alternatives Rejected

- 1つの`KiroAdapter`でACP/TUIをmode分岐: transport固有lifecycleとcleanupが混ざり、片方の証拠を他方へ誤適用しやすい。
- `codex-exec-live.ts`型の巨大helperへKimi/Kiro条件を追加: NFR-04とIssue #1717の小さなinterface方針に反する。

### Reversibility

高い。adapter IDとportは局所的で、共通contractを変えずに個別adapterをfollow-up-linkedへ戻せる。

## ADR-02: legacy journeyを単一の共通lifecycleへ移行する

### Context

既存Kimi/Kiro driverには有用なtransport mechanicsがあるが、旧gate、ambient env、cleanup、自由形式resultが残る。新adapterを並行追加すると、同じtransportに安全契約の異なる二重live pathが生まれる。

### Decision

Q1=Aのユーザー裁定どおり、既存journeyを`runLiveJourney`へ移行する。driverからprocess/ACP/tmux mechanicsだけをadapter内部portとして再利用し、旧policy/lifecycle経路は削除する。互換shimは置かない。

### Consequences

- 全live pathが同じgate/cleanup/outcome/ledgerを通る。
- 既存testの呼び出し変更が必要だが、全面書き直しより回帰面を限定できる。
- 移行はadapter実装とjourney配線を同一Unit/Intentで揃え、dormant adapterを残さない。

### Security and compliance

旧ambient env経路を残さないことでbypassを防ぐ。credentialをコピーせず、source pathをchild/ledgerへ渡さない。

### Alternatives Rejected

- 旧journeyと新journeyの二重運用: Issueが要求する「既存を含む全live path」の保証にならない。
- mechanicsを全面再実装: 実績あるACP/tmux protocolを捨て、回帰と実装量を増やす。
- opaque subprocessとして旧driverを呼ぶ: policy/cleanupを二重化し、resource ownershipを曖昧にする。

### Reversibility

中。test呼び出しは戻せるが、二重経路復活は安全contract退行となるため通常のrollback対象にしない。

## ADR-03: Kiroの接続可否をtransportごとの証拠で裁定する

### Context

Kiro ACP/TUIの安全なauth/config bindingと完全cleanupは現時点で未確定である。Requirementsは各transportをconnectedまたは条件付き後続Issueで閉じ、connectedの場合は各自のcontract/integration/live greenを要求する（FR-09〜FR-15）。

### Decision

ACP/TUIを独立probeし、次の全条件を満たす場合だけ`status: supported`とadapterを正規登録する: safe auth/config isolation、allowlisted env、deterministic anchor、abort/cleanup closure、contract/integration green、transport自身のlive green receipt。不成立なら`unsupported`または`unverified`と`followUpIssue`を登録する。

### Consequences

- 一方だけconnected、他方follow-up-linkedという正直なmatrixを表現できる。
- 実測前にdormant adapter slotを先行実装しない。
- matrix-onlyの「要調査」完了を防ぐ。

### Security and compliance

auth seam不成立を理由にambient HOMEを許可することを禁止する。follow-up Issueにもsecret値やraw transcriptを添付せず、sanitized evidenceだけを使う。

### Alternatives Rejected

- ACPがgreenならTUIもsupported扱い: transport固有auth/termination/cleanupを未検証のまま能力継承する。
- contractを緩めて両面を接続: NFR-05とScope W5に反する。
- measured-onlyを完了扱い: FR-10/15の二択完了を満たさない。

### Reversibility

高い。follow-up解決後に同じ証拠条件を満たせば、registry statusとadapter配線を更新できる。

## ADR-04: credential/resource lifecycleをadapter明示所有にする

### Context

Kimi symlink、ACP child/process group、TUI tmux serverはcleanup対象が異なる。共通`ResourceRegistrar`はresource stateを持つが、作成・解放方法はtransport固有である（FR-03/06/12/20、NFR-01/02）。

### Decision

各adapterはresourceを作成前にplanned登録し、作成成功時にcreated、解放確認後にreleasedへ遷移させる。common lifecycleはadapter cleanupと共通leak checkを統合し、retained/failure/leakが1件でもあればPASS receiptを拒否する。

### Consequences

- 部分準備、timeout、例外でも回収対象を失わない。
- adapterごとにrelease実装が必要だが、common層はresource種別を知らずにbarrierを判定できる。
- locatorは診断用sanitized identityとし、credential値を含めない。

### Security and compliance

credential-bearing flagを持つresourceを監査できる。raw secret、source auth path、full outputはdurable receiptへ含めない。

### Alternatives Rejected

- test終了時の一括temp directory削除だけに依存: child/tmux/symlinkなどroot外resourceと部分失敗を見落とす。
- global process registryを新設:常駐状態と同期問題を増やし、短命CLI設計に反する。

### Reversibility

中。resource contractは既存kernelに沿うため、adapter内部のrelease mechanicsは交換可能である。

## 決定サマリー

| ADR | 主な要件 | Lock-in | Gateでの確認事項 |
|---|---|---|---|
| ADR-01 | FR-01/11/13、NFR-04/05 | 低 | transport別adapter境界 |
| ADR-02 | FR-07/13/16/17、Q1=A | 中 | legacy二重経路を残さない |
| ADR-03 | FR-09〜FR-15 | 低 | connected/follow-upの証拠条件 |
| ADR-04 | FR-03/06/12/20、NFR-01/02 | 中 | cleanup barrier優先 |

