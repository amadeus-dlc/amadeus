# Build Test Results — 260728-gated-swarm-serializatio

上流入力(consumes 全数): code-generation-plan.md、code-summary.md — 検証対象の変更面と落ちる実証の由来は code-summary.md、検証コマンド列は code-generation-plan.md Step 9 に対応。

## 実測結果(最終ツリー: bolt/1612-gated-swarm-gate head e9a0dd58a = main 再接地+deslop+単一repo coverage 是正後。全て exit code 転記)

| 検査 | exit | 備考 |
|---|---|---|
| bun run typecheck | 0 | 再接地後に再実行 |
| bun run lint:check | 0 | Biome、既存 complexity warning のみ、error なし |
| bun run dist:check | 0 | 7ハーネス再生成後 |
| bun run promote:self:check | 0 | self-install 5ツリー |
| bun tests/complexity-gate.ts --check | 0 | 新規違反0(tryEmitSwarm は関数抽出で CCN 閾値内) |
| bun tests/run-tests.ts --ci --coverage | 0 | Test files: 636 / Assertions: 8,747 / Failed files: 0 / Failed assertions: 0 / RESULT: PASS |
| Issue #1612 対象5ファイル | 0 | 85 tests / 172 expectations / fail 0 |
| AMADEUS_PATCH_BASE_REF=origin/main bun tests/coverage-patch-gate.ts --check | 0 | 68/68 covered / allowlisted 0 / uncovered 0 / PASS |

## 再接地(base-advance-regrounding)の記録

PR #1648 が CONFLICTING で CI 不発(cid:code-generation:conflicting-pr-suppresses-ci の実例)→ merge-base 実測 a372165e8、区間に #1628 系(#1636/#1638/#1645)着地。merge-tree プローブはマーカー0(ステール)だが、共有台帳2件(coverage-patch-allowlist / coverage-registry)が真の分岐、かつ #1645 の audit JSONL 化による**意味的衝突**1件が CI 再実行で顕在化:

- 台帳解消: allowlist は theirs(281件)基底に ours の行ピン remap 12件を位置整列(identity 除 lines の difflib equal opcode)で再適用。registry は merge 後のテスト全集合から gen-coverage-registry.ts で機械再生成。JSON parse+マーカー grep 0 を確認
- 意味的衝突: t33 approve-batch の audit assert 2件が旧 markdown シャード形式を grep していた → main 側 set-autonomy と同じ auditRecords()(JSONL parse)へ是正(コミット d06d557af)。**GATE_APPROVED の emit 自体は新 journal 経路で正しく機能**(是正後 t33 34/34 pass が実証)
- merge 完遂の機械確認: parent 数 2 / ls-files -u 0。再接地後に dist 再生成+全検証を再実行(上表)

## 帰属を確定した既存赤

- t-team-up-codex-resume.serial.test.ts「a safety-wait launch failure cleans every started supervisor」: full CI 中1回のみ 3422ms タイムアウト境界で赤。単独実行 54/54 pass ×2、最終 full CI PASS。同テストは #1337 で並列帯 flake の直列化履歴があり、本 diff は scripts/team-up.sh 非接触 — 負荷起因 flake と帰属(assertion 実文確認済み)

## PR / CI

- PR #1648(https://github.com/amadeus-dlc/amadeus/pull/1648)。最終 head e9a0dd58a、base 9b0c520c1。mergeable=MERGEABLE / mergeStateStatus=CLEAN。
- GitHub Actions run 30355946356 は必須16 checks 全成功、失敗0、pending 0。Tests、Typecheck、Lint and complexity、Dist and self-install drift、Coverage Report(head/base/patch)、Intent Mirror、Plugin conformance、CI Success を含む。
- Cursor Bugbot は利用上限で neutral。自動レビュー結果ではなく、下記の増分レビューで補完した。

## 2026-07-28 deslop 継続・最終再接地

- deslop 6件を `937818283 refactor(swarm): simplify gated batch orchestration` としてコミット。共有 approvals parser、1-origin batch、3状態 autonomy、重複 alias 除去、長大コメント整理、section anchor 整合を保持した。
- origin/main 9b0c520c1 を `0765e5229 merge: reground gated swarm fix on main` で再接地。唯一の競合 `tests/.coverage-patch-allowlist.json` は、実在する mirror return 2255 と telemetry 呼出し 2145 へ行番号を追従させた。
- 最終 patch coverage で単一repo invoke-swarm 分岐1行を検出し、in-process 回帰テストを `e9a0dd58a test(swarm): cover single-repo batch directive` で追加。最終 gate は 68/68 covered。
- 増分レビューは d06d557af 以降の deslop、main再接地、競合解消、単一repoテストを対象に実施。契約破壊、未解消競合、生成物drift、追加修正要求はいずれも0。verdict=READY。
- ローカル全CIは追加テスト前後の2回とも成功。最終実測は 636 files / 8,747 assertions / failures 0。AWS認証期限切れのため live SDK/substrate tests は規定どおりskip。

## CI 実測の更新(独立クロスレビュー Major-1 への是正、2026-07-28T10:30Z 頃)

- 初回 CI run 30347753185 は **conclusion=failure で確定**(当初記載の in_progress から更新)。失敗は Coverage Report (head) ジョブの `t224-upstream-v2-migration-cli.test.ts:972` 1件(`expect(result.status).toBe(0)` — Expected 0 / Received 1)。
- 帰属証拠(クロスレビュアーの独立実測): (a) 本 Bolt の変更24ファイルに migration 系・t224 は不交差(grep 0件) (b) t224 はローカル full CI 内 PASS+単独 58/58 pass (c) 同ジョブは別 SHA c89e319fb でも別テスト t295 で失敗しており負荷起因 flake の常習面。ただし theirs(main 748e693e3)では success のため flake と断定はせず、**再実行による green 実測を verdict 確定の条件とする**。
- 失敗ジョブを `gh run rerun --failed` で再実行 → run 30347753185 は **conclusion=success で確定**(2026-07-28T10:18:37Z 実測、`gh run view` 転記)。PR checks 全 pass(CI Success / Coverage Report head・base / Tests / Lint and complexity / Dist and self-install drift ほか)。同一 SHA d06d557af での再実行 green により、初回 t224 赤は当該 SHA 上で非決定的(負荷起因)と確定(cid:code-generation:rerun-red-reattribution)。**条件 (1) 充足**。
- patch gate 行の provenance(Minor-1): 本表の patch gate は builder が再接地後に生成した lcov による実測。worktree 同梱の coverage/lcov.info(mtime 17:46 = 再接地前)で再実行すると STALE 6件の偽赤になるため、後続検証者は `AMADEUS_PATCH_LCOV` で新鮮な lcov を指定すること(クロスレビュアーが新鮮 lcov で exit 0 / 67-of-67 を独立再確認済み)。

## 検証済み面と未検証面(verdict の書き分け)

- **検証済み**: engine 契約レベルの全挙動 — gated invoke-swarm emit、バッチ末尾ゲートの fail-closed、承認台帳、ladder 再提示、approve ガード対称、autonomous/skeleton 回帰(全て決定的テスト+落ちる実証)。監査 emit の JSONL journal 経路
- **未検証(申告)**: Linux CI 面(ローカル macOS 全緑は Linux 面の成立を意味しない — 初回 CI の t224 赤は再実行 green で非決定的と確定し、Linux CI 面は run 30347753185 success で成立)。実ワークフローでの複数バッチ gated swarm の live end-to-end 運転(現用 intent に複数バッチ DAG が不在のため機会なし)。エンジンレベルの決定的テストで契約は閉包済みだが、初回の実運用時は観測を推奨
- approve-batch の human-presence 未強制は仕様判断として分離済み(#1647、CG ゲートでユーザー裁定)
