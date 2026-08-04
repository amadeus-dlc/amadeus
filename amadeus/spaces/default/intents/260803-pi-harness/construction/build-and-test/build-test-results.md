# Build and Test Results — Piハーネス正式対応

各Unitの `code-generation-plan.md` と `code-summary.md` に対するComprehensive検証の実行記録である。

## Build・静的検証

- `mise trust`: 実行済み。
- `bun run typecheck`: exit 0、型エラー0。
- `bun run lint`: exit 0、error 0、既知warning 392、info 23。
- `bun scripts/package.ts` と `bun scripts/package.ts --check`: 8ハーネスすべてOK。
- `bun run promote:self:check`: project-local self installと正本が一致。
- `bun tests/complexity-gate.ts --check`: 新規違反0、regression 0。
- `bun tests/unchecked-cast-guard.ts --check`: 新規cast 0、既存残存36。
- `bun tests/no-silent-drop-gate.ts check --base-revision 272cac2afa3f8f6245192885bcfa5aebeb11465a`: `NO_SILENT_DROP_OK`、findings 0。
- `git diff --check`: exit 0。

## 自動テスト

- 最終CI対象: 781 files、10,533 assertions。
- 最新の全CIでは780 filesがPASS、1 fileが絶対時間上限のみでFAILした。該当は `t07-hook-audit-logger` の500 ms / 300 ms上限で、高負荷並列時に1,660 ms / 389 msだった。
- 同ファイルを直後に `bun test --timeout 120000 tests/unit/t07-hook-audit-logger.test.ts` で単独再実行し、16 pass、0 fail。実測はlogging 113 ms、skip 103 msで上限内だった。機能assertionの失敗はないため負荷フレークとして扱う。
- その前の全CIで発見したPi manifest unit testのsize分類違反は、MarkdownをBun text importへ変更してfilesystem依存を除去した。該当2 filesは23 pass、0 failで再検証した。
- Pi conformance / child driver集中再検証は12 pass、0 fail、110 assertions。
- setup plan / install flow / doctor / candidate conformance集中再検証は22 pass、0 fail、494 assertions。
- AWS資格情報切れによるlive SDK / Claude substrateテストはrunner契約どおりtyped skip。Pi実機検証とは別扱いである。

## Performance実測

| 指標 | 実測 | 合格上限 | 判定 |
|---|---:|---:|---|
| Kimi固定baseline median | 0.0007915 ms | — | 基準 |
| Pi adapter median | 0.0009170 ms | 100.0007915 ms | PASS |

10 warm-up後にKimi/Piを100回交互実行した。外部provider、network、filesystemを測定対象に含めず、NFR-PERF-001の `max(2 × Kimi median, Kimi median + 100 ms)` を満たす。

## 実Pi検証で検出・修正した不具合

- fresh workflowのscope回答をverdict-only `report`へ送っていたため、元のdescriptionを保持した `next --scope ...` へ戻すよう修正した。
- continuation tokenが`agent_start`後に付与された場合を取りこぼしていたため、同一processの`agent_settled`観測で継続できるよう修正した。
- phase boundaryでverificationを飛ばせる経路を閉じ、`phase_boundary`を明示してphase-checkを必須化した。
- active intentがあると`--status`、`--doctor`等のutility flagを落とす問題を修正した。
- Pi extension heartbeatをdoctorへ投影し、実機で `pi-extension` の発火時刻を確認できるようにした。
- Linuxで同一millisecondのjournal event順が不定になる問題を、durable sequenceで安定化した。
- 利用者のglobal Git ignoreに `vendor/` があると、配布済みOTel runtimeがcandidate commitから欠落する問題を再現した。Pi配布 `.gitignore` に `!/.pi/vendor/**` を追加し、global ignore下のcandidateテストを追加した。
- setup manifestが `.pi/tools/data/harness.json` をshared / optionalに分類し、doctorの必須receipt契約と矛盾する問題を修正した。installer生成descriptorをowned / requiredへ分類した。
- live RPCの親lifecycle未接続、利用枠到達後のaccount継続成功の棄却、settled後timeout、cleanup timer残留を修正した。
- provider family `openai-codex`だけをPiへ渡し、`pi-multi-account`が利用可能なaccountと、そのaccountに紐づくmodelを自動選択する経路を実装・検証した。

## Security・信頼境界

- TUIのinteractive入力だけがhuman presenceを成立させ、RPCは `HUMAN_TURN=0` / `GATE_APPROVED=0` を維持した。
- trust storeを自動編集せず、project-only trustをmacOS/Linuxの実Piで確認した。
- missing / changed / symlinked resourceをdoctorがfail-closedに扱う回帰を確認した。
- credential、trust-store内容、raw provider output、raw TUI transcriptは保存・commitしていない。
- redacted TUI transcriptはdigestのみをformal evidenceへ使用した。

## Formal Pi evidence

- 候補commit: `55055f3888516efcc337dfffd9266ff5cff8eef6`。
- catalog digest: `1de5fb00895d333472de2c7c02f0f0807df7521e8a1f11ba988353a6bf619160`。
- Pi: macOS / Linuxともに0.83.0。
- account / model: 両platformとも `openai-codex-account-2/gpt-5.6-sol`。base accountが利用不可のためmulti-accountが自動選択した。
- macOS TUI: `HUMAN_TURN=11`、`GATE_APPROVED=1`、`SESSION_COMPACTED=1`。restart後のResumeとdoctor 36 passed / 0 failedを確認した。transcript digestは `747078a9726928bf50aa4ced3ef6935fc21643c3c348e5641d89dc6d581da74d`。
- Linux TUI: `HUMAN_TURN=15`、`GATE_APPROVED=1`、`SESSION_COMPACTED=1`。restart後のResumeとdoctor 36 passed / 0 failedを確認した。transcript digestは `a052d3f5e353aa03ce04f2e315e2262f2596208ed6efd2ccb6ce5c2c0b78ae27`。
- macOS / Linux live RPC: `status=passed`、`driverTerminal=succeeded`、`HUMAN_TURN=0`、`GATE_APPROVED=0`、output digest `68430e4de7a5a2a8f5759309a064ea7e0c6cd38dbba02ff56f7652a902234539`。
- native Windows: doctor `pi.os` rejectionをnegative evidenceとして記録した。
- M1〜M10を同一候補へ結合した一時evidenceを `bun scripts/pi-conformance-evidence.ts` で検証し、`status=green` を得た。一時evidenceはcredentialを含まないが、manual checklistの指示どおりrepositoryへcommitしない。
