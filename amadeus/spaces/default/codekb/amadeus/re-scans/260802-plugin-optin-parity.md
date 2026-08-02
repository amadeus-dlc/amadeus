# 260802-plugin-optin-parity 差分スキャン

## スキャンメタデータ

- Date: `2026-08-02`
- Base commit: `33e196b80b2254eee733fcaec4359dfbdd29c24b`
- Observed commit: `689c38744cb9f4fcf2eb517e490cb66b3bb58ce8`
- Distance: `55 commits`
- Focus: [Issue #2018](https://github.com/amadeus-dlc/amadeus/issues/2018) — プロジェクトが導入対象として記録した plugin 名と、全ハーネスの materialization／composition／activation parity
- Scan mode: differential refresh。Issue本文とコメント2件、Developer Code Scan、base..observedの焦点差分、現行plugin／harness／projection／testコードを照合した。既存9成果物は全面再生成せず差分節だけを追加した。ゲート前に `origin/main` へrebaseし、#2017の config module正規名 `amadeus-config.ts` への変更を取り込んだ。

## 全ハーネス evidence

| Package face | Host directory | Trigger／契約 | observed 状態・例外 |
| --- | --- | --- | --- |
| Claude Code | `.claude` | native SessionStart | stagingとcomposition recordが存在し、formal-model-check advisoryが発火する |
| Codex | `.codex` | adapter SessionStart | staging／record欠落。0/0 current no-opによりadvisoryが無音 |
| Cursor | `.cursor` | adapter sessionStart | staging／record欠落。同じ0/0経路 |
| OpenCode | `.opencode` | manual-only | auto-composeを持たない設計例外。manual triggerと明示診断が必要 |
| Kimi | `.kimi-code` | adapter SessionStart | staging／record欠落。同じ0/0経路 |
| Kiro CLI | `.kiro` | adapter agentSpawn | Kiro IDEとhostを共有。staging／record欠落 |
| Kiro IDE | `.kiro` | adapter promptSubmit相当 | Kiro CLIと同じhost状態を共有し、face別二重composeはしない |

Issueの独立クロスレビューは `.claude` の composed=true/advisory=1 と `.codex`／`.cursor`／`.opencode`／`.kimi-code` の composed=false/advisory=0 を直接確認した。Kiroはreview時のworktreeにhostがなく未実測だったが、現行package matrixと2 adapterが共有 `.kiro` の同一core compose hookを呼ぶことをコードで確認した。

## 欠陥機序と状態表

- `isRecordCurrent` は discovered plugin数とrecord plugin数がともに0ならtrueとなり、`compose --if-stale` は `record-current` no-op／exit 0を返す。doctorも `Plugins: 0 installed`、activationもcomposition不在なら `[]` を返す。
- プロジェクト側に導入対象の plugin 名を記録する場所がないため、意図的な plugin 0件と opt-in 済み host の欠落が観測上同一になる。`plugins/formal-model-check/` は tracked authoring supply であり、opt-in 意思そのものではない。

| Desired | Staged | Recorded | 判定 |
| --- | --- | --- | --- |
| 空 | 空 | 空 | healthy silent。plugin-free zero-impactを維持 |
| `P` | 欠落 | 欠落 | stale／degraded。materializeまたはmanual actionが必要 |
| `P` | `P` | 不一致 | compose required |
| `P` | `P` | current | healthy |

## テスト evidence と設計含意

- baseline: `bun test --timeout 120000` で `t299`／`t328`／`t327`／`t322` は25/25 pass（Developer Code Scanの実測）。
- `t299` はopt-inなしの0/0 silent successを維持すべき契約としてpinする。`t328` は事前stagingにより、desired非空なのにhost欠落する本件を迂回する。`t379`／`t381` は全6 host、OpenCode例外、3 checkpoint、main／`--single` の組合せを網羅する必要がある。
- `t320` は空spec集合のSHAを正常値としてpinし、`t382` はspec root誤りを捕捉するが空集合自体は拒否しない。`computeSpecHash` の空集合正常化は同根のfail-openであり、uncomposed pluginの早期returnを保ったfail-closed化が推奨候補である。
- 責務は desired reader／validator、current-host materialization、doctor／compose比較、activation read-only trust boundaryに分ける。SessionStartから`--all-harnesses`を呼ばず、OpenCode manual-onlyとKiro shared hostを維持する。
