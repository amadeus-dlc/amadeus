# TLA+ Authoring 前提ブロッカー引き継ぎ

## 現在の状態

- Intent `260811-pr-convergence-gate` は `tla-authoring` でpark済みである。
- Intent autonomy は `full` から `semi` へ変更済みで、full-autonomy grantは解除済みである。
- park境界はIntent mirror Issueへ同期済みである。
- Issue #2838の実装、主要テスト、Code Generation、Build and Testは完了している。
- 現在のPull Requestは [#2911](https://github.com/amadeus-dlc/amadeus/pull/2911) だが、後続コミットに対する最終attestationとconvergenceは未完了である。

## 解消済みのブロッカー

requirements extractorは `FR-2` を受理する一方、trace refereeのstable-ID正規化は `FR-002` 形式だけを受理していた。この不整合に対して、要件コーパスと同じ `FR/NFR/AC-(qualifier-)*digits` 文法へ正規化処理を揃える修正と回帰テストを、Issue #2838 worktreeに未コミット変更として保持している。

修正後のtrace refereeは次の証拠を生成した。

- subjects digest: `sha256:1c22f6d5b39d2958ba42733cbbbd02368b32ac263a13f448bf2d736e73b6e691`
- rows digest: `sha256:3859e8c48c1b062b2d49dd2e26f7f05969fbcdbfe5bf2cfa9f77038d4b35d95e`
- invariants digest: `sha256:65fb69730566a92f4e14f40895feddd961225712852ce863df7dc7e0d20ca9c6`

## 未解消の前提ブロッカー

`tla-authoring` の `author-new` routeに、proofとmodel-map登録の循環依存がある。

1. stage契約は、新規モデルのproof成功後にmodel-mapへ登録する。
2. production TLC adapterはproof準備時にreceiptをmodel-mapから再検証する。
3. 未登録モデル `PrConvergenceGate` は `PreparationError/MODEL_RECEIPT: verified model is unavailable: PrConvergenceGate` で拒否される。
4. proof evidenceがなければregistration commitも拒否されるため、順序を逆転できない。

baseline、全falling mutation、全vacuity witnessが同じ準備エラーとなった。詳細は同ディレクトリの `proof-failure.json` に記録した。

この不具合は [Issue #2913](https://github.com/amadeus-dlc/amadeus/issues/2913) として起票済みである。

## full autonomyで停止不能になった理由

汎用manual parkをfull autonomyで拒否する挙動自体は、無人runを任意停止させないための正規契約である。一方、ノルムは修復不能時にQuality Repairが `REPAIR_STALLED` を発行し、full-autonomy grantを維持したまま安全にparkすることを要求している。

今回のstage-owned typed failureはcanonical construction failureへ接続されず、retry/replanにも `REPAIR_STALLED` にも到達しなかった。そのためforward-only reportとmanual park guardの間で停止不能になった。この回復経路の欠落は [Issue #2912](https://github.com/amadeus-dlc/amadeus/issues/2912) として起票済みである。

## 前提修正用worktree

- worktree: `/Users/j5ik2o/orca/workspaces/amadeus/issue-2913-tla-authoring-proof-receipt`
- branch: `fix/2913-tla-authoring-proof-receipt`
- base: `origin/main` (`854692fd7a11b124236b0427fe3d59e2fe6bf785`)
- 実行済み: `mise trust`
- 実行済み: `bun install --frozen-lockfile`
- 実行済み: `bun run build`
- 初回buildにより `.codex/hooks.json` が新規生成された。

## 再開条件と次の手順

Codexの実行中タスクは途中生成された `.codex/hooks.json` を再読込しない。したがって、前提修正は上記worktreeを保持した同一ディレクトリの新規タスクで再開する。

再開後は次の順で進める。

1. Issue #2913を `self-fix`、Minimal depth、`autonomy=semi` で開始する。
2. production `FsTlcToolchain` を通して未登録モデルが `MODEL_RECEIPT` で落ちる再現テストを追加する。
3. referee専用のon-disk byte bindingを追加し、production model-checkの登録済みmodel-map pinを緩めない最小修正を実装する。
4. baseline、falling mutation、vacuity witnessを実TLCで検証する。
5. 対象テスト、typecheck、lint、build、distribution/source-only検査を実行する。
6. Issue #2913の独立Pull Requestを作成する。マージは人間の明示承認まで行わない。
7. 前提修正の着地後、Issue #2838 worktreeへ最新 `origin/main` を取り込み、`/amadeus --resume` で本Intentを再開する。

## スコープ境界

- Issue #2913の修正は専用worktree・専用Pull Requestに分離する。
- Issue #2838 worktreeには前提修正を混在させない。
- proof receiptやmodel-mapを手編集して循環依存を回避しない。
- Issue #2838の最終Pull Request attestationは、全workflow記録コミット後に再生成する。
