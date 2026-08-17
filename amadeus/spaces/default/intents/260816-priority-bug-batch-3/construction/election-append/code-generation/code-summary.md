# code-summary draft — Bolt 5 (unit: election-append, FR-5 / Issue #3046)

## 変更ファイル(`git show --stat HEAD` 転記、commit 1240d0f0b)

```
 packages/framework/core/tools/amadeus-election-store.ts        |  75 ++++-
 tests/helpers/election-append-race-child.ts                    |  50 +++ (new)
 tests/integration/t3046-election-append-voter-race.integration.test.ts | 346 +++++ (new)
 tests/integration/t549-election-v2-store.integration.test.ts   |  71 +++--
 4 files changed, 504 insertions(+), 38 deletions(-)
```

## 主要判断

- ADR-5 実装契約1〜6を機械的に射影(計画 Step 1-9 完了)。
- `appendPending`(旧 :1042/:1063)の採番・同一性検査を `readAllPending`(全 voter 読取)から `readPendingVoter`(呼出 voter 自身のファイルのみ)へ完全移管。読取集合=書込集合を1関数内で保証し、readAllPending への依存経路をゼロにした(契約1)。
- `readAllPending` の一意性検査を素の `arrivalSequence` から複合キー `(voter, arrivalSequence)` へ変更。cross-voter の同一値再利用は正常形とし、voter 内重複のみ corrupt のまま(契約2)。
- 全体順序の比較関数 `comparePendingEvents`((arrivalSequence, voter) 辞書式)を1箇所に集約し、readAllPending の sort で共有(契約3)。
- `readPendingVoter` に voter ローカル厳密単調性の新規 assert を追加(`arrivalSequence <= previousSequence` → corrupt)。これは既存になかった新しい fail-closed ガード(契約2/3)。
- D-09 設計コメントを「単一 writer 前提」から「voter ごとの独立ファイル・ロック不要・cross-voter は構造的に非衝突・same-voter は last-write-wins」へ全面書換(契約3)。
- 同一 voter の並行二重投稿(同一ballotの競合)は既存の tmp+rename 書込機構により non-destructive であることを実プロセステストで確認・文書化(契約4)。ロック等の新規機構は導入していない(契約5、互換シムも追加なし)。

## Red → Green 実測

- Red: `bun test tests/integration/t3046-election-append-voter-race.integration.test.ts`(修正前コード)→ 5 tests 中 5 fail(exit 1)。バリア同期(Bun.spawn 実プロセス2本 + busy-wait barrier file)によるクロスvoter競合再現で `verify().ok===false`(corrupt)を観測。事前の scratch smoke test(10試行)でも 6/10 で corrupt を再現(未コミットscratchのみ、repo外)。
- Green: 同コマンド(修正後)→ `5 pass / 0 fail`(exit 0)、3回の追試でも安定して green(flaky なし)。
- 既存 seam(t549/t235/t373)再実行: `bun test tests/integration/t549-election-v2-store.integration.test.ts tests/integration/t235-election-store.integration.test.ts tests/integration/t373-election-ballot-blind-storage.integration.test.ts` → `24 pass / 0 fail`(exit 0、t549 は既存4件を ADR-5 挙動に追従修正しつつ1件を2件へ分割)。
- 関連選挙テスト全体(t236/t259/t261/t3077/t417/t451/t553/t554/t559/t260/t261-drift): `81 pass / 0 fail`(exit 0)、回帰なし。

## Property テスト(fast-check, Step 7)

- seed 固定 `0x3046`(fast-check デフォルト numRuns)。
- P1: voter 自身のファイル内 `arrivalSequence` が非単調な場合、`verify()` が fail-closed で corrupt を返すことを pin(オラクルは "sorted と入力が異なる" の構造チェックのみ、sort 再実装なし)。
- P2: cross-voter で重複する raw seq が readAllPending に受理され、返却順が (arrivalSequence, voter) の隣接関係を満たすことを pin(オラクル2種: 件数の permutation 保存 / 隣接ペアの関係充足 — ソートの再実装はしていない、pbt-oracle-cancellation 遵守)。

## 逸脱・申し送り

1. **既存 t549 テスト4件の書換**: ADR-5 でグローバル採番→voter ローカル採番へ変わったことに伴い、(a) cross-voter 同一 arrivalSequence を corrupt とする旧pin → 「正常形」であることを示す pin + 「voter内重複のみ corrupt」の新設 pin へ分割、(b) `appendPending(bob)` で他voterの偽造ファイルを検出する3件のprobeを `appendPending(alice)`(=偽造対象のvoter自身)へ変更(契約1により他voterのファイルを読まなくなったため)、(c) 到着順ベースの ledger 順序期待値 `["bob","alice"]` を辞書式tie-break後の `["alice","bob"]` へ訂正。いずれも ADR-5 が明示的に許容する破壊的変更の範囲内で、計画 Step 8 の「既存テスト追従」に該当。
2. **writeStoreFile の共有一時ファイル名による発見(新規、範囲外)**: 同一voterへの真の並行二重投稿(同一ballot)を実プロセスで競走させたところ、`writeStoreFile` が固定の `${path}.tmp` を使うため、敗者側の `renameSync` が ENOENT で `io-error` を返すことがある(store自体は単一の正しいイベントを保持し corrupt しない。テストでは `a.ok || b.ok` を要求し、敗者の `io-error` を許容する形に調整)。これは ADR-5(#3046)のスコープ外(計画の除外事項「並行 voter の実運用化(将来 intent)」に該当)であり、本Boltでは修正していない。将来 intent での対応候補として申し送る。
3. amadeus-election.ts(CLI)は無改変(契約どおり)。

## 検証(worktree内)

- `bun run typecheck` → exit 0
- `bunx biome lint <変更4ファイル>` → exit 0(warning/error なし。当初 P2 property の cognitive complexity 超過をヘルパー関数抽出で解消)
- 対象テスト(t3046 新規 + t549/t235/t373)→ 29 pass / 0 fail
- `bun run build` → 成功(dist/ 全ハーネス再生成、追跡ファイルへの影響なし)
- `bun tests/gen-coverage-registry.ts --check` → "coverage registry: OK (fresh, guards green, ratchet held)"(新規テストファイル追加後も resync 不要と判定、regen は実施済み扱い)
- coverage-patch-allowlist.json の15件の amadeus-election-store.ts エントリを確認 — いずれも本変更で触れた関数(appendPending/readAllPending/readPendingVoter/comparePendingEvents)と無関係(consumePending/verifyPartialHistoryBaseline/createOnly/appendTimeline/writeCommitState 等)で resync 不要
- フルスイートは未実行(push-first 方針どおり)

## コミット

- SHA: `1240d0f0b`
- メッセージ: `fix(#3046): scope pending ballot numbering per voter to remove the append TOCTOU`(Conventional Commits, 英語, attribution なし)
