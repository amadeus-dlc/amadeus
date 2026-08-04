# Code Generation Plan — fix-2125-election-state-guard(Issue #2125)

上流入力(consumes 全数): `requirements.md`

測定 ref: 作業 base = `763ebf676`(worktree `bolt/2125-election-state-guard`)。

## 触るファイルの目録

### 正本(`packages/framework/core/tools/`)

| ファイル | 変更内容 | 対応 FR |
|---|---|---|
| `amadeus-election.ts` | `handleTally` に state ガード追加 / `handleNotify` に state ガード追加 / `handleReport` の `tallied` 経路に timeline append 追加 / `handleVerify` の `verifySelf` 呼出しへ kind-order 文脈を渡す | FR-1a、FR-1b、FR-2b、FR-3 |
| `amadeus-election-record.ts` | `VerifyFinding.kind` に1値追加 / kind 順序検査クラス追加 / FR-3d 台帳定数追加 / `verifySelf` シグネチャ拡張 | FR-3a〜FR-3d |
| `amadeus-election-store.ts` | `Store.materialize` 末尾の `kind:"tallied"` append を削除(tally.json 書込で終わる) | FR-2a |

`amadeus-election-model.ts` は変更しない(C-2 スキーマ不変)。

### テスト

| ファイル | 変更内容 | 層 |
|---|---|---|
| `tests/integration/t236-election-loop.integration.test.ts` | FR-1a / FR-1b / FR-2b の新規テスト追加 | integration(NFR-4) |
| `tests/integration/t235-election-store.integration.test.ts` | FR-2a に伴う既存テストの改訂(FR-4) | integration |
| `tests/unit/t238-election-record.test.ts` | FR-3 の kind 順序検査クラスの新規テスト追加 | unit(NFR-4、純関数) |

新規 tNNN ファイルは作らない(既存 election スイートへの追加で NFR-4 を満たす)。

### 生成物

`bun scripts/package.ts` → `bun run promote:self` で 12 投影面を再生成する(NFR-3)。手編集はしない(C-4)。

## TDD の順序(vertical slice、1件ずつ Red → 最小実装 → Green)

`cid:code-generation:tdd-default-with-narrow-exceptions` に従い、合意済みの公開 seam(`main` の CLI verb / `verifySelf`)へ失敗テストを1件追加して Red を実測してから最小実装で Green にする。

| Slice | 公開 seam | Red にするテスト | 最小実装 | FR |
|---|---|---|---|---|
| S1 | `main(["tally", …])` | `collecting` 以外の6 state で exit 1、tally.json / timeline.json がバイト不変 | `handleTally` 冒頭の state 検査 | FR-1a |
| S2 | `main(["notify", …])` | `draft`/`tallied`/`rendered`/`recorded`/`hold` で exit 1・timeline バイト不変、`open`/`collecting` は受理 | `handleNotify` 冒頭の state 検査 | FR-1b |
| S3 | `main(["tally"…])` / `main(["report","--result","tallied"…])` | `tally` 単独では timeline に `tallied` なし、`report --result tallied` 後にちょうど1件・`at` が `talliedAt` と一致 | `Store.materialize` の append 削除 + `handleReport` への append 追加 | FR-2a / FR-2b |
| S4 | `verifySelf` | 3パターン(重複 `tallied` / `tallied`→`distributed` / `tallied`→`ballot`)が新 finding kind を返す | kind 順序検査クラスの追加 | FR-3a / FR-3c |
| S5 | `verifySelf` | `resumedTo === "collecting"` の resolution を伴う重複 `tallied` は finding を返さない | reopen 予算の判定 | FR-3b |
| S6 | `verifySelf` | 台帳掲載の選挙 ID は同型 timeline でも finding を返さない | FR-3d 台帳定数の参照 | FR-3d |
| S7 | `main(["verify", …])` | CLI 経由で kind 順序違反が exit 1 になる(配線) | `handleVerify` から文脈を渡す | FR-3 配線 |

各 slice の Red/Green はコマンドと実出力で記録し、`code-summary.md` へ転記する。

## 落ちる実証(NFR-5)

新設ガード(FR-1a / FR-1b)と新設検査クラス(FR-3)について、実装完了後に**実行時に消費される行**へ失敗ケースを注入し、対象テストが実際に赤くなることを実測する(`cid:code-generation:inject-runtime-consumed-lines`)。注入 → 赤の実測 → revert を不可分の1セットで行い、注入を head に残さない(`cid:code-generation:falling-proof-injection-one-set`)。

## FR-3d 台帳の確定手順

`amadeus/spaces/default/elections/*/timeline.json` を機械走査(repo 外 scratch スクリプト、`cid:requirements-analysis:scratch-script-discipline`)し、走査出力をそのまま `code-summary.md` へ転記する(`cid:requirements-analysis:ledger-count-mechanical-recalc`、`cid:reverse-engineering:measurement-ref-in-artifacts`)。

## A-1 の実装時再検証

`Store.materialize` / `Store.appendTimeline` の production 呼出し元を repo 全域 grep で再列挙し、CLI 層ガードで窓が塞がることを確認する(`cid:requirements-analysis:enumeration-reverify-at-implementation`)。

## 検証コマンド(すべて同期実行し exit code を個別に読む)

1. `bun scripts/package.ts`
2. `bun run promote:self`
3. `bun run typecheck`
4. `bun run lint`
5. `bash tests/run-tests.sh --ci`
6. `bun run dist:check`
7. `bun run promote:self:check`
