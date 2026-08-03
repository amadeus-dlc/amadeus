# Code Summary — u4-hook-dispatcher

## 実装結果

- Claude self-install の11 hook参照を、固定10 slugを受け取る共有 `amadeus-dispatch.ts` 経由へ統一した。`mint-presence` は2イベントから参照されるため、10 slug / 11参照となる。
- dispatcher は絶対パスの `CLAUDE_PROJECT_DIR` を優先し、未指定時は `import.meta.dir` から project root を解決する。呼び出し元の cwd には依存しない。
- shellを介さず Bun childを起動し、追加argv、stdin、stdout、stderr、終了コード、SIGINT/SIGHUP/SIGTERMを転送する。
- 未知slug、相対 `CLAUDE_PROJECT_DIR`、project root外へのsymlink、部分生成treeは明示的に失敗する。固定10 hookがすべて不在の場合だけ fresh clone と判定し、`bun run build` の案内を出して exit 0 とする。
- harness manifestへ正本を追加し、package / promote-self の正規生成経路で root と `dist/claude` を同期した。3面のdispatcherはbyte-identicalである。
- coverage registry、hook inventory文書、file roster、mechanism honesty ratchetを新しいhook / CLI-spawnerへ追随させた。

## 要件追跡

| 要件 | 実装・証跡 |
|---|---|
| FR-3.2 / BR-U4-1〜2 | 固定10 slug表、未知slugのloud failure、全slug委譲テスト |
| BR-U4-3〜4 / ADR-A5 | project root解決、完全tree検査、realpathによるroot外symlink拒否 |
| BR-U4-5 | `.claude/settings.json` の11参照をdispatcherへ変更。`.claude/settings.local.json.example` はhook参照0件のため変更なし |
| BR-U4-6〜7 | cwd外実行、child I/O・argv・exit・signal透過、fresh clone / partial tree両方向テスト |
| C3 | 正本を `packages/framework/harness/claude/` に置き、生成コマンドでroot / distへ同期 |

## 設計判断と差分

- NFR設計の「対象slug単位の不在no-op」は部分生成treeを許す余地があったが、Unit指示の整合性契約を優先した。10実体がすべて不在のときだけno-opとし、1件以上存在するtreeの欠落はfail-closedとした。
- 配布faceの直接hook設定にはこのUnitで指定された11参照以外も存在するため変更していない。dispatcherはself-install設定のtransport helperとして文書と整合性テストへ明示した。

## TDD実績

- Red: dispatcher未実装・設定未切替の状態で `bun test tests/integration/hook-dispatcher.integration.test.ts` を実行し、7/7失敗を確認した。
- Green: 最小実装後に9/9、44 assertionsを通過。固定10 slug、11参照、未知slug、全不在、部分欠落、cwd非依存、I/O・exit・signal透過、symlink escape拒否を実 Bun process境界で検証した。
- 保守ゲート追加後: dispatcher、file roster、hook docs inventory、coverage registryの4ファイルで68/68、1,462 assertionsを通過した。

## 検証結果

- `bun run typecheck`: 成功。
- `bun run lint`: 成功（既存のcognitive-complexity warningを含む標準baseline）。変更6 TypeScriptファイルの明示Biome checkもdiagnostic 0。
- `bun scripts/package.ts --check`: 7 harnessすべて成功。
- `bun run promote:self:check`: self-install全対象faceで成功。
- `bun tests/gen-coverage-registry.ts --check`: fresh、hook 14/14 covered、ratchet保持。
- `git diff --check`: 成功。
- 全CIを内包するcoverage run: 755ファイル、10,248 assertions中、754ファイル / 10,247 assertionsが成功。既知cold test `t227-codex-migration-walking-skeleton` の15秒timeout 1件のみ失敗した。同testは `bun test --timeout 120000` で単独成功（9.83秒）。同じrunで本Unitのfocused test、mechanism ratchet、静的・drift各ゲートは成功した。
- project coverage gate: 90.1725%（baseline 40.9395%、+49.2331pp）で成功。patch coverage gateはdirty worktreeを拒否する契約のため、commit後に実行する。
- AWS live SDK/substrate test: credentials無効のためrunnerがskip。dispatcherにnetwork / AWS境界はない。

## 非該当・残余リスク

- 常駐処理、network、database、外部serviceを持たない固定10要素の短命CLIであるため、専用performance testと外部E2Eは追加していない。
- 既知cold testの標準15秒timeoutは本Unit外の環境感応性であり、120秒単独Greenを収束証跡とする。dispatcher固有の未解決事項はない。
