# Code Summary — unit config-visibility(U7 / C7+C8 / FR-7+FR-8)

## Commits(worktree `bolt-config-visibility`、base `swarm-int-rfc0001@57f40d5d5`)

| sha | subject |
|---|---|
| `42127b7ce` | feat(config): abolish solo-election.trigger.mode, rename consent-axis config keys (RFC-0001 C7/C8) |
| `b962c2712` | chore(tests): regenerate coverage registry for new t3130/t3131 units |

## 実装 summary

コミット `42127b7ce`(49ファイル)の内訳:

- `amadeus-config.ts`(138行差分): `solo-election.trigger.mode` config leaf削除、`deriveSoloElectionTrigger(mode)`純関数追加、`LEGACY_PATH_REPLACEMENTS`/`LEGACY_KEY_REPLACEMENTS`を廃止系/改名系で分割し診断メッセージを書き分け(R-3)。
- `amadeus-election.ts`(28行差分)・`amadeus-orchestrate.ts`(15行差分): solo-election trigger の2 owned consumer を宣言済みIntent Autonomy Modeからの導出へ更新(R-8、下記「申し送り」参照)。
- `amadeus-autonomy-status-facet.ts`(新規、62行): `statusAutonomyFacet`(C8) — U2/U5/U6/本unitの実効判定関数を合成するのみ。
- `amadeus-statusline.ts`(21行差分): `--status`/statusline へ非対話マーカーを配線。
- `amadeus-directive.ts` / `amadeus-finding.ts` / `amadeus-lib.ts` / `amadeus-mirror-coordinator.ts` / `amadeus-mirror-lifecycle.ts` / `amadeus-mirror-presentation.ts` / `amadeus-state.ts` / `amadeus-utility.ts` / `amadeus-workflow-completion.ts`: `intent-mirror.github.issue.mode→.consent`、`finding.github.issue.creation.mode→.consent` のconsent-field改名を下流consumerへ同期。
- `amadeus/config.json`(9行差分): プロジェクトのconfig面をリネーム後のキー名へ同期。
- `docs/guide/21-layered-config.{md,ja.md}` / `docs/guide/22-intent-mirror.{md,ja.md}` / `docs/reference/19-layered-config.{md,ja.md}` / `docs/reference/20-intent-mirror.{md,ja.md}`: キー名変更のdocs同期。
- テスト側: `t431-structured-config.test.ts`(152行差分)、`t3130-status-autonomy-facet.integration.test.ts`(新規、111行)、`t3131-nonInteractiveMarker.test.ts`(新規、27行)、`t432-config-vocabulary-drift.integration.test.ts`ほか計29ファイルの既存ピン更新。

## 検証(実測、worktree HEAD `b962c2712`)

| コマンド | 結果 |
|---|---|
| `bun run typecheck` | exit 0 |
| `bun run lint` | exit 0(470件のpre-existing complexity warnings、無関係。触った4関数(`amadeus-statusline.ts:136 phaseProgress`、`:285 main`、`amadeus-config.ts:508 parsePluginScopeBindings`、`amadeus-directive.ts:896`)はすべて未改変・pre-existing) |
| `bun tests/gen-coverage-registry.ts --check` | exit 0(regen後) |
| `bun run build` | exit 0、dist/*+self-install再生成・クリーン |
| targeted suite(29ファイル、config/mirror/finding/election/statusline/status/coverage-drift、365テスト) | 365 pass / 0 fail |

pre-existing失敗3件(本unit起因ではない、別parentコミット`57f40d5d5`のdisposable worktreeで同一失敗を再現確認済み):
- `t265-engine-boundary.integration.test.ts`の「in-process completion and carrier boundaries」クラスタ(15テスト、human-presence-gate関連、config無関係)
- `t265-engine-boundary.test.ts`の「final report keeps a multi-intent workflow addressable...」(build-and-test artifacts欠落、無関係)

## Red 逐語

R-1〜R-5(amadeus-config.ts registry): 実装前、pre-edit `amadeus-config.ts` に対し `tests/unit/t431-structured-config.test.ts` を実行 →
```
SyntaxError: Export named 'deriveSoloElectionTrigger' not found in module
```
Registry abolish/rename + `LEGACY_PATH_REPLACEMENTS`/`LEGACY_KEY_REPLACEMENTS`分割の実装後: 17/17 pass。

C8 statusAutonomyFacet(新規モジュール、事前exportなし): `t3130-status-autonomy-facet.integration.test.ts`/`t3131-nonInteractiveMarker.test.ts` は未作成の `amadeus-autonomy-status-facet.ts`/`nonInteractiveMarker` export に対するimport解決失敗として赤 → 実装後4/4、2/2 pass。

owned-consumer編集(`amadeus-election.ts`/`amadeus-orchestrate.ts`): `bun run typecheck` がRedゲート(既存テストが実行時経路をカバー済みのため) — `TS2339 soloElection does not exist on config type`、2箇所で確認してから修正。

## 申し送り

- **FDリーフ文書からの逸脱(開始前に解決済み)**: `construction/config-visibility/functional-design/` 配下のFDリーフ文書(business-rules.md R-8、domain-entities.md、functional-design-questions.md Q4)は `amadeus-election.ts:274` と `amadeus-orchestrate.ts:4139` を「owned-files外・本unit実装しない」と明記していた。しかしteam-lead dispatchはこの2ファイルの改修を「owned-filesの追加」として明示割当。`inception/units-generation/unit-of-work.md` の現行(post-review, iteration-2 READY)行を確認したところ、両ファイルはowned列に記載され、注記「実測: fd-draft-c 報告 + conductor 再実測」があった — すなわちunit-of-work.mdはFDリーフ起草後に、FD自身のIteration-1レビューが指摘したFOLLOW-UP(2消費者を誰もownしていない)を閉じるため更新されていた。unit-of-work.mdを現行かつ正本のownership記録として扱い実装した。FDリーフ文書はunit-of-work.mdに対しstaleであり(記載のとおり修正はしていない — そのFD文書の編集自体もこのunitのowned-files writeではないため)。
- **クロスunit follow-up(未修正、docs-norms/U12 owned per unit-of-work.md)**: `packages/framework/core/amadeus-common/protocols/stage-protocol.md`、`conductor.md`、`packages/framework/core/skills/amadeus-election/SKILL.md`、`amadeus/spaces/default/memory/team.md` は依然として廃止済みのconfig駆動solo-election trigger(「layered configがsolo-election.trigger.modeをautoへ解決する」)を記述している。ランタイム挙動は`deriveSoloElectionTrigger(Intent Autonomy Mode)`へ移行済み。これらはunit-of-work.mdの明示列によりU12(FR-14)のowned filesであり、本unitでは編集していない。`t432-config-vocabulary-drift.integration.test.ts`と`t369-protocol-autosolo-hook.test.ts`のクロスサーフェス文字列ピンテストは現行(未変更)内容を検査しているため緑のまま残るが、U12が文言を書き換えた後、新しい文言が実ランタイムと一致することを強制するテストは現時点で存在しない — FR-14の受け入れ検査としてfollow-upにすべき。
- **FDリーフ文書自体のstale状態(記録専用artifact、本unitのworktree write scope外につき未修正)**: 上記2owned consumerに関するFD leaf docsのstale記述はそのまま残置。
- **検証の3pre-existing失敗**: 対象外・未修正(上記「検証」節参照)。
