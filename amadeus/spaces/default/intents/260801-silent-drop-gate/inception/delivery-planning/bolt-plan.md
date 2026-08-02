# Bolt Plan — no-silent-drop

## 上流入力と計画制約

本計画は `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`、承認済み `delivery-planning-questions.md` を正本とする。User Stories、Refined Mockups、Team Formation は scope 上 SKIP のため、SC-01〜SC-07 と FR-12 の直接 acceptance を価値追跡単位とし、全 Bolt を `amadeus-developer-agent` が担当する。

team／org ノルムに従い 1 Unit = 1 Bolt とし、各 Bolt は隔離 worktree と独立した [Pull Request](https://github.com/amadeus-dlc/amadeus/pulls)／スカッシュコミットを持つ。経済的順序は walking-skeleton-first とし、後続候補は lightweight WSJF と failure impact で比較する。DAG は U1／U2／U3 が相互非依存、U4 が3者すべてに依存する。

## Batch と Bolt の正準列

| Batch | Bolt | Unit | 実行形態 | Walking skeleton | 依存 |
|---|---|---|---|---|---|
| 1 | Bolt 1 | `static-gate-engine` | 単独、必須ゲート | Yes | なし |
| 2 | Bolt 2 | `mirror-persistence-propagation` | Bolt 3 と並列 | No | なし |
| 2 | Bolt 3 | `text-mutation-loud-failure` | Bolt 2 と並列 | No | なし |
| 3 | Bolt 4 | `repository-adoption` | 単独、統合 | No | Bolt 1／2／3 |

## Bolt 1 — static-gate-engine

### Scope と walking skeleton

U1 と Application Design の C1〜C6 を実装する。`GitReadPort`、root `no-silent-drop` script、manifest、immutable snapshot、ast-grep adapter、TypeScript semantic classifier、baseline／exemption ratchet、evidence command、閉じた JSON／exit contract を同じ Bolt に置く。

walking skeleton は主静的ゲート経路の全 integration seam を通す。U4 が後で供給する classification／approval／base SHA は versioned contract fixture で代替し、U2／U3 の修正後 evidence も synthetic post-evidence fixture で境界を検証する。U4 の正本値、CI wiring、generated projection は実装しない。

### Definition of Done

- NSD001〜003 の positive／negative fixture が100%分類される。
- manifest→snapshot→ast-grep→semantic classification→policy／ratchet→renderer が同一 bytes chain で動く。
- Pass／Violations／Error が stdout JSON と exit 0／1／2へ一意に写像される。
- zero／partial scan、tool／rule／schema／trusted-base 異常が fail-closed になる。
- 同一 snapshot の結果が byte-deterministic で、性能測定の前提を満たす。
- dependency pin、lockfile、root script の最終 writer が U1 に閉じる。

### Confidence hypothesis と expected demo

仮説: 「構造候補＋semantic classifier＋trusted previous set の組合せは、漏れ・同数置換・内部異常の green 化を防ぎ、短命 Bun CLI として実用時間内に動く」。

demo: 正常 fixture は exit 0、新規違反は finding identity 付き exit 1、partial scan／不正 ledger は typed Error 付き exit 2。同一 source finding と current ledger identity の同時追加も拒否する。

## Bolt 2 — mirror-persistence-propagation

### Scope

U3 と R3／R4 の commit-state-machine 境界を実装する。新しい public outcome、rollback、同期 retry は追加しない。

### Definition of Done

- `persistBlocked` が `applyTransition` の `StateResult` を1回だけ検査する。
- pre-commit failure は `warning.effect=not-started` となり state／audit／outbox bytes が不変である。
- state rename 後の directory fsync failure は `warning.effect=outcome-unknown` となる。
- commit 後の audit append／outbox clear failure は `ok(outbox-pending)` と既存 drain へ写像される。
- failure-injection test が lock〜rename前、fsync、audit append、outbox clear を覆い、重複なしで収束する。

### Confidence hypothesis と expected demo

仮説: 「既存 `MirrorOperationOutcome.warning` を維持したまま、commit 境界の偽 `safety-blocked` success を排除できる」。

demo: 各 failure point について typed outcome、永続 bytes 差分、outbox drain 後の収束を同じ表で示す。

## Bolt 3 — text-mutation-loud-failure

### Scope

U2 と R1／R2 を実装する。`ValidatedStageState`、`TextMutationResult = changed | not-found`、postcondition 再 parse と全 caller の write-before-success を閉じる。

### Definition of Done

- duplicate／malformed stage line は既存 validation failure、対象0件は bytes-invariant `not-found` になる。
- 既に期待値の target は同一 bytes の idempotent `changed` になる。
- jump、utility、state、Bolt fragment merge の全 caller が result を exhaustive に検査する。
- not-found／malformed／duplicate／idempotent の focused test と caller integration test が green になる。
- retry、暗黙 resync、warning success は0件である。

### Confidence hypothesis と expected demo

仮説: 「局所 typed result と再 parse だけで、既存成功経路の互換性を保ちながら silent text no-op を除去できる」。

demo: 存在しない slug／suffix に対して typed failure を返し、state／audit bytes が呼出前と一致する。

## Bolt 4 — repository-adoption

### Scope

U4 を実 corpus、canonical ledger、CI、package／promotion へ統合する。U1〜U3 の内部 algorithm と `package.json` は編集しない。

### Definition of Done

- `C_pre-raw`／`C_post-raw`、classification ledger、approval receipt、approved evidence の digest chain が全単射になる。
- `B0 ⊂ B_pre`、削除 identity=#1874／#1878、追加0件、initial exemption set が確認される。
- FR-12 の t407／t411 回帰が green になる。
- CI が base SHA と current canonical ledger を U1 CLI に供給し、既存 lint job の独立 blocking step が root script を呼ぶ。
- cold／warm各5試行の最大値が15秒以内、corpus FP率が5%以下になる。
- `bun scripts/package.ts --check`、`bun run promote:self:check`、Comprehensive regression が green になる。
- generated tree は canonical core から再生成し、直接編集しない。

### Confidence hypothesis と expected demo

仮説: 「承認済み evidence、trusted-base ratchet、blocking CI、distribution drift guard を接続すれば、runtime修正と静的gateを無音退行なしでrepository全体へ固定できる」。

demo: 同一 revision で local／CI の exit が一致し、新規違反、ledger growth、scan異常がすべてblocking failure、正当な修正後状態がgreenになる。

## Construction handoff

- Batch 1 完了後に walking-skeleton gate と ladder prompt を処理する。
- Batch 2 は U2／U3 を別 worktree・別変更レビュー単位で同時実行する。共有 mutable state と source ownership の交差はない。
- Batch 3 は U1／U2／U3 の合格証跡と着地 revision を入力にして開始する。
- Build and Test は全 Bolt 後に一度だけ Comprehensive strategy で実施する。
