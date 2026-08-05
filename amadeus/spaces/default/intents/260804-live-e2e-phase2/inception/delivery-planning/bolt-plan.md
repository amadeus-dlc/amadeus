# Bolt Plan — live E2E Phase 2

## 入力と計画原則

本計画は [requirements.md](../requirements-analysis/requirements.md)、[components.md](../application-design/components.md)、[unit-of-work.md](../units-generation/unit-of-work.md)、[unit-of-work-dependency.md](../units-generation/unit-of-work-dependency.md)、[unit-of-work-story-map.md](../units-generation/unit-of-work-story-map.md) を入力とする。

ユーザー裁定Aにより、Kiro TUIを最大リスクのWalking Skeletonとして最初に置く。各transport Unitは実装、test、live receiptまたはqualified follow-up Issueまでを同じ境界で閉じるため、`1 Unit = 1 Bolt = 1 PR`とする。順序は `TUI → ACP → Kimi → Evidence` で、最後のEvidence Boltだけが先行3 Boltすべてに依存する。

## Bolt sequence

| Bolt | Unit | walking skeleton | 推定変更行数 | branch | 依存 |
|---:|---|---|---:|---|---|
| 1 | `kiro-tui-live-e2e` | **Yes — 単独・ゲート付き** | direct: 550〜900 / follow-up: 120〜260 | direct またはfollow-up-linked | なし |
| 2 | `kiro-acp-live-e2e` | No | direct: 500〜850 / follow-up: 120〜260 | direct またはfollow-up-linked | Bolt 1（delivery admission） |
| 3 | `kimi-print-live-e2e` | No | 350〜550 | direct | Bolt 2（delivery admission） |
| 4 | `phase2-live-e2e-evidence` | No | 100〜250 | closure | Bolt 1〜3 |

follow-upレンジはadapter本実装とlocal liveを行わず、sanitized probe、qualified Issue、registry/matrix link、検証testへ閉じる場合の見積りである。受け入れ基準ではなく、Functional Design後に更新する。

## Bolt 1 — Kiro TUI risk-first Walking Skeleton

- **Definition of Done:** private tmux、scratch home/env、disk/state anchor、bounded pane evidence、timeout/abort時killを実測する。成立時は`KiroTuiAdapter`、contract/integration test、opt-in local live green receiptまで閉じる。不成立時はsanitized blocker evidence、推奨seam、再開条件、検証可能ACを持つGitHub Issueを作り、registryを`unsupported`または`unverified`＋Issue linkにする。どちらでもmeasured-onlyを残さない。
- **Confidence hypothesis:** 最も不確実な対話型transportでも、共通policy/lifecycleがユーザー設定と認証を漏らさず、resource cleanupとcanonical outcomeを維持してconnected/follow-upの価値結果まで到達できる。
- **Expected demo:** directではprivate tmux journeyのgreen receiptとcleanup-closed ledger、follow-upでは再現可能なsanitized evidence、Issue URL、matrix行を示す。
- **Gate:** self-featureのWalking Skeletonとして単独実行し、人間承認後にラダープロンプトへ進む。

## Bolt 2 — Kiro ACP

- **Definition of Done:** auth/config binding、ACP JSON-RPC、structured tool anchor、abort/cancel、descendant reapを実測する。成立時は`KiroAcpAdapter`、contract/integration test、opt-in local live green receiptまで閉じる。不成立時はBolt 1と同品質のqualified follow-up Issueとregistry linkで閉じる。
- **Confidence hypothesis:** structured protocol transportがTUIとは独立した自身の証拠で、同じcommon contractを弱めずに完了できる。
- **Expected demo:** directではstructured anchorを含むgreen receipt、follow-upではACP固有のsanitized evidence、Issue URL、matrix行を示す。

## Bolt 3 — Kimi Print

- **Definition of Done:** 既存`kimi-print-drive.ts`のmechanicsを`KimiPrintAdapter`へ移し、credential symlink、設定home、allowlisted child env、timeout/cleanupをcontract/integration testで固定する。旧journeyを`runLiveJourney`へ一本化し、明示opt-inのKimi自身のlocal live receiptを得る。
- **Confidence hypothesis:** 既知のprint transportを共通kernelへ移行しても旧policy/lifecycleを残さず、Kimi固有credential bindingを隔離できる。
- **Expected demo:** fakeによるdeny/env leak/timeout/cleanup tests、Kimi opt-in live green receipt、`kimi-print` matrix行を示す。

## Bolt 4 — Phase 2 Evidence Closure

- **Definition of Done:** Kimi、Kiro ACP、Kiro TUIの各行をsupported＋自身のgreen SHAまたはfollow-up-linkedにし、ledger/projector/matrix schema、runbook、Codex・Claude・Pi回帰、build、source-only境界を検証する。cleanup失敗を含む実行はPASSへ投影しない。
- **Confidence hypothesis:** Phase 2の全transport結果が個別証拠から決定的に再構成でき、Issue #1717のPhase 2完了判定にmeasured-onlyやtransport間の証拠継承が残らない。
- **Expected demo:** final capability matrix、receipt/Issue link、最終green SHA、回帰コマンド結果を一つのclosure reportとして示す。

## 実行・PR契約

- 各Boltは隔離worktree、独立PR、独立review・rollback・verification境界を持ち、`main`へスカッシュマージする。
- Bolt 1は必ず単独で実行する。Bolt 2と3はcode-level transport契約上は独立だが、registry、projector、serial testsの共有編集と承認済みrisk-first順のため、runtime DAGへdelivery admission edgeを記録して直列化する。先行実diffで正本ファイルが非交差と確認できた場合も、並行化はDAG更新と再compileを伴う再裁定後に限る。
- 全実装BoltはTDDでRedを実測後、最小Green、関連回帰、local liveの順に進める。通常CIではlive processを起動しない。
- 各Boltがreview READYになった時点でBolt branchとPR発行を明示タスク化し、人間のマージ承認を待つ。
