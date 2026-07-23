# U2 election-promotion — Code Generation Summary

## 実装結果

- 選挙エンジン5ファイルを `scripts/` から `packages/framework/core/tools/` へ `git mv` し、旧側を削除した。`scripts/amadeus-election-migrate.ts` は移動していない。
- CLIの `amadeus-norm-metrics` importを同層相対へ収束し、5ファイルの相互importをcore/tools内で閉じた。
- 最新mainで追加済みのregistry-backed path resolver、migration fidelity、leader sync、formal-verifのロジックを変更せず、参照パスとsource-fidelity期待値だけを新正本へ追随した。
- `contrib/skills/amadeus-election/` を `packages/framework/core/skills/amadeus-election/` へ `git mv` した。SKILL.mdは `{{HARNESS_DIR}}/tools/amadeus-election.ts` を使用し、repository checkout依存を除いた。
- claude manifestとcodex emitterへskillを配線した。CLI 5ファイルは全6 dist、skillはclaude/codexの2面だけへ投影した。
- U1 boundary guardの一時的contrib例外を除き、fixtureの検出力を維持したままlive finding 0へ閉包した。

## Files Created / Modified

- 移動: `packages/framework/core/tools/amadeus-election{,-model,-store,-record,-transport}.ts`
- 移動: `packages/framework/core/skills/amadeus-election/SKILL.md`
- 配線: `packages/framework/harness/claude/manifest.ts`、`packages/framework/harness/codex/emit.ts`
- 参照追随: `scripts/amadeus-election-migrate.ts`、`scripts/amadeus-leader-sync.ts`、`scripts/formal-verif/arm-s-{model-subject,runner}.ts`
- テスト追随: t234〜t244、t258〜t264、formal-verif、skills conformance、Codex packaging
- 再生成: 全6 `dist/` とproject-local self-install管理面

## Key Decisions

- registry resolver (`d1f2ed5aa`) とmigration fidelity (`8bbfb70b5`) は既存mainで充足済みのため、再実装せず保護対象として回帰確認した。
- U2の移動対象は設計どおり5ファイルに限定した。migration CLI、leader sync、formal-verifは消費側のまま維持した。
- C3 skill integrationは既存5件に、canonical token、compatibility、contrib不在、claude/codex展開、非対象4面不在の5件を追加し、10件とした。
- U4専有のtemp HOME＋fake herdr/agmsg＋self-install合流journeyは追加していない。

## Comprehensive Test Evidence

| 層 | 実測 |
|---|---|
| Unit | 選挙model/record/transport/choice/registry/migration 7ファイル: 89 pass / 0 fail |
| Integration | store、directive loop、transport、machine executor、skill、tie、registry resolver、migration fidelity、drift doctor、formal-verifを実FS／実spawnで検証 |
| C3 skill contract | `t242-election-skill-vocabulary.integration.test.ts`: 10 pass / 0 fail |
| E2E | `t237-election-walking-skeleton.test.ts`: 1 pass / 0 fail / 21 assertions |
| U1 boundary | unit＋integration: 24 pass / 0 fail。live finding 0、fixture red維持 |
| U2対象総合 | 変更前21ファイル: 207 pass / 0 fail / 4.28秒。変更後22ファイル: 219 pass / 0 fail / 4.42秒 |

## Distribution Evidence

- 全6 distの `tools/` に選挙5ファイルが存在する。
- claudeは `.claude/skills/amadeus-election`、codexは `.agents/skills/amadeus-election` に存在する。
- cursor、kiro、kiro-ide、opencodeのdistには `skills/amadeus-election` が存在しない。
- scripts側の対象5ファイル、contrib側skill、配布面の旧 `scripts/amadeus-election.ts` 参照はいずれも0件。
- `bun run dist:check`、`bun run promote:self:check` は全対象面でPASS。

## Final Verification

- `bun run typecheck`: PASS。
- `bun run lint`: exit 0。既存warning 251件、info 17件、error 0件。
- `bun tests/gen-coverage-registry.ts --check`: PASS。
- `git diff --check`: PASS。
- `bash tests/run-tests.sh --ci`: 476 files / 6801 assertions、failed files 0、failed assertions 0、RESULT PASS。

## Deviations

- U1 live guardはtracked self-install skillも走査するため、Step 7で正本置換後にpackage/self-installを一度同期してgreen化し、Step 12で最終再生成・drift checkを再実行した。
- 設計作成後に追加されていたmigration/leader-sync/formal-verif消費面を、機能変更なしのパス追随対象へ含めた。

## Issues / Concerns

- CI環境のAWS credentialsが無効または期限切れのため、live SDK/substrate testsはrunnerによりskipされた。
- `tests/integration/t-codex-hooks-migration.test.ts` に既存wall-clock drift advisoryが1件ある（declared medium、32.98秒でlarge）。
- lint warningには移動後の `amadeus-election-store.ts` の既存complexity warningも含まれる。選挙ロジック変更禁止のため本Unitではリファクタしていない。

## Next Steps

1. 推奨: Architecture reviewerで、移設の最小性、非対象4skill面、最新main機能の保持をレビューする。
2. U4でclean-environment合流journeyを実装する。
3. AWS credentialsが有効な環境でlive testsを補完する。
