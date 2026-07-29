# Issue #1681 コード生成サマリー

## 結果

`auto-mirror=auto` の phase boundary は、Mirror Issue の有無にかかわらず固定の mirror lifecycle boundary command を発行するようになりました。Mirror Issue がなければ既存 coordinator が guarded create、存在すれば guarded sync を選びます。`amadeus-orchestrate` は create/sync を直接選択しません。

## 変更内容

- `MirrorBoundaryDecision` の一時的な `auto-sync` 分岐を、operation 非依存の `auto-lifecycle` に変更した。
- `auto` の全ケースを `amadeus-mirror-lifecycle.ts boundary phase` へ委譲した。
- phase boundary の案内文を sync 専用表現から mirror operation 共通表現へ修正した。
- `off/prompt/auto × Mirror Issue 不在/存在` の6組を、ideation/inception/construction の各 boundary で検証した。
- generated CLI の integration matrix で、auto/no-issue が質問せず lifecycle command を発行し、state を進めないことを検証した。
- 英日 reference document に guarded create/sync、prompt-only ask、off no-op、durable retry 契約を反映した。
- 全 harness の配布 tree と project-local self install を再生成した。

## TDD 記録

### Red

変更前の対象テストは 65 件中 6 件だけ失敗した。

- unit: auto/no-issue と auto/existing-issue の decision 名 2 件
- integration: ideation/inception/construction の auto/no-issue 3 件
- E2E: generated CLI の auto/no-issue 1 件

既存 receipt、retry、workflow completion のテストは Red 時点でも Green であり、不具合境界を限定できた。

### Green

- t265 unit/integration/E2E: 65 pass
- mirror executor/coordinator/lifecycle: 66 pass
- mirror docs contract/parity: 5 pass
- typecheck: pass
- lint: pass（既存 cognitive-complexity warning のみ）
- complexity gate: 0 new violations、0 regressions
- package drift check: 全7 harness pass
- promote-self drift check: 全5 self-install face pass

## Issue #1607 への rebase

更新済みの Issue #1607 親ブランチへ rebase し、canonical とテスト階層の競合を意味解決した。

- Issue #1681 の `auto-lifecycle` と、Issue #1607 の明示的な `--intent` / `--space` selector 伝播を両立した。
- phase、completion、pending receipt、terminal commit の各 command に同じ selector を保持した。
- generated harness tree と project-local self install は競合を手編集せず、canonical から再生成した。
- 親ブランチの exact-route fixture、t265、mirror executor/coordinator/lifecycle/completion の focused regression を結合実行し、215 pass、0 fail、941 expect を確認した。
- mechanism ratchet、audit emitter、drift meta-validation は 24 pass、0 fail、43 expect を確認した。
- typecheck、lint、coverage registry、complexity gate、package drift check、promote-self drift check、diff check はすべて pass した。

## 全 CI

`bun run coverage:ci` の通常 CI profile は 653 files、9091 assertions、0 failures で完了し、fresh LCOV を生成した。

patch coverage gate は measurable added lines 10、covered 5、allowlisted 5、uncovered 0 で pass した。allowlist は実測 `DA:0` の `306`、`308`、`370`、`403`、`405` に限定し、stale entry 0 を確認した。

## 非変更保証

- Issue #1607 の workflow completion transaction、completion instance、terminal commit と selector 伝播を保持した。
- guarded create/sync の canonical operation selection、durable identity、receipt reducer、GitHub gateway は変更していない。
- untracked の Bolt runtime state と audit shard は成果物へ含めない。
