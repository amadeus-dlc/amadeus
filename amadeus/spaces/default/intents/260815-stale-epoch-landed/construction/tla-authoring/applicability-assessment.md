# TLA+ Authoring — 適用性判定(terminal: impl-only、authoring 不要)

- 実施: 2026-08-15 / intent 260815-stale-epoch-landed(Issue #3110)/ PR #3113 head `4a5cc1135`
- 検査した識別子(requirements.md 全数): FR-1(stale created × MERGED の landed 最終化)/ FR-2(誤 PR 作成防止)/ FR-3(sensor の landed 受理整合)/ FR-4(規範衝突の選挙裁定反映)/ FR-5(obb6 実適用)/ FR-6(台帳同期)+ NFR(TDD / append-only / 後方互換禁止)

## 判定

| subject | 基準適合(並行/再開 × 無音違反) | 登録モデルとの関係 | route |
|---|---|---|---|
| pr-convergence 収束プロトコル(FR-1/FR-2/FR-3) | 接触する(resumable な epoch lifecycle) | **PrConvergenceGate** 登録済み。ただしそのモデルの実装ピンは `packages/framework/core/tools/amadeus-orchestrate.ts` と `amadeus-state.ts` の 2 件(model-map.json entries、本起草時に実読)であり、本 intent の変更面(plugins/github-pr-convergence/tools/ 4 file + sensor)は**ピン外**。engine 側ゲート(sensor 要求・verdict 消費)の到達可能挙動は無変更で、変更は CLI 側 report lifecycle の実装面(landed を merge 事実として受理する arm の追加)。obb6 #3062(landed 受理の導入)を impl-only と裁定した既存判定と同クラス | **impl-only** |
| FR-4(文書・学習反映)/ FR-6(台帳) | 文書・台帳同期 — 並行性なし | 対象外 | non-target |
| FR-5(obb6 実適用) | 修正済み CLI の運用適用 — 新規プロトコルなし | 対象外 | non-target |

## 裏付け実測

- model-map.json の PrConvergenceGate entries に本 intent の変更ファイルが**不在**であることを実読で確認(`python3` で JSON parse — pr-convergence-cli / git-runner / gh-runner / sensor いずれも 0 hit)
- pinned 2 ファイルは本 PR の diff に不在(8 files 変更のうち engine 側 0)→ 実装ハッシュピンの resync 不要
- リモート CI run 31890284881(head 4a5cc1135)**conclusion: success** — formal-verif 系検査(SOURCE_DRIFT 等)を含む必須 check 全 green。`Formal model check` ジョブは model/cfg/pinned-impl 無変更につき skipping(発火条件非該当 — 判定と整合)

## 結論

authoring(author-new / revise-model)対象なし — impl-only 1 件 + non-target 2 群の terminal-route。承認は本ステージゲート(Intent Autonomy full の auto-approve、グラント intent-grant-0d1d32b933f0111723f0e167e16fd476 経由)で記録する。
