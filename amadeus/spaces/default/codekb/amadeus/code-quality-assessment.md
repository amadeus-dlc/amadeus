# Amadeus コード品質評価

## 観測メタデータ

- 観測日: 2026-08-04
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- このReverse Engineeringはread-only scanであり、full suiteや課金live journeyは実行していない。

## 品質基盤

| 項目 | 評価 | Evidence |
|---|---|---|
| 型検査 | Good | `bun run typecheck`、root/ tests tsconfig |
| Lint | Good | Biome 2.5.5、`bun run lint` |
| テスト層 | Good | smoke/unit/integration/e2e/perf/formal-verif、`tests/run-tests.ts` |
| Distribution | Good | isolated deterministic build、source-only、manifest inventory |
| CI | Good | `.github/workflows/ci.yml`と専用workflow群 |
| ドキュメント | Good/Fair | 英日guide/referenceは充実、共有CodeKBは履歴追記で肥大化していたため今回current viewへ再構成 |
| モジュール性 | Fair | core/harness/setup境界は明確だが、一部巨大tool fileは高fan-in/fan-out |

## Common live E2E の品質

commit `12bf94ea6` はcommon kernel、4 adapter、unit/serial e2e、runbookを同時導入している。`tests/unit/t-live-e2e-kernel.test.ts` はregistry、policy、matrix等を検査し、`tests/harness/live-e2e/testing/` はfault injectionとoracleを提供する。skip side-effect禁止、env allowlist、timeout abort/reap、cleanup barrier、ledger/matrix driftを個別assertionとして表現している点は強い。

一方、`tests/harness/live-e2e/runs.jsonl` はObserved時点で0行であり、repository内に共通kernel上の永続green receiptはない。従ってstatic/contract testの存在とlive green証跡を混同してはならない。

## Kimi品質評価

既存print driverはbinary/dist/opt-in gate、timeout、tmp config、credential非copy symlink、status/doctor journeyを持ち、CLI実走の土台はある。しかし次がcommon contract未達である。

- `GITHUB_ACTIONS=true` hard denyがない。
- skip理由が自由文でcanonical codeではない。
- child envを`process.env`全体から構築する。
- symlink/child/scratchのresource lifecycleとleak scanがない。
- stdout/stderrのraw全量を結果に保持し、共通bounded/sanitized evidenceへ未投影。
- legacy testにcommon contract/fault casesを適用していない。

評価はFair（機能実績あり、安全契約未接続）。

## Kiro CLI品質評価

ACP driverはJSON-RPC parsing、permission request、tool update、timeout cancel、keepAlive、deterministic tool boundaryを持つ。TUI driverはprivate tmux serverでuser default serverを避け、disk terminatorとloud timeoutを持つ。複数live journeyが既存能力を示す。

ただし全ACP/TUI testが個別`skipReason`を重複実装し、canonical taxonomy/registry/ledgerを使わない。ACP `Bun.spawn` とTUI shellはambient env/homeを継承し、source auth/config pathの非漏洩を証明できない。private tmux labelもcommon resource registrarに未登録で、run単位cleanup barrierと結びつかない。

評価はFair/At-risk（広いlive実績はあるがPhase 2の安全不変量に未接続）。

## 技術的負債と改善優先度

1. Kimiを`LiveAdapter`へ接続し、env allowlist、canonical gate、resource cleanup、contract testを固定する。
2. Kiro ACP/TUIのauth/config/home実測を行い、直接接続可能な最小transportを選ぶ。
3. 個別`skipReason`重複を共通preflightへ寄せる。ただしPhase 2で対象外driverまで一括改修しない。
4. common live ledgerに実revisionのgreen receiptを残しmatrixを更新する。課金liveはローカル明示opt-inのみ。
5. Kiro接続不能なら、阻害要因・推奨seam・検証可能な受入条件付きIssueを作る。共通contractを弱めない。

## 検証上の未知点

- Kiro CLI 2.13.0のauth/config保存場所と、source pathをchildへ渡さないcredential binding方式。
- ACP process groupのabort→TERM/KILL/reapが全子孫へ効くか。
- Kiro TUIをfresh HOMEで起動した場合のlogin再利用可能性と初回UI。
- Kimi credential symlinkのcleanup後にCLI子孫がhandleを保持しないこと。
- Observed revisionでのKimi/Kiro共通kernel live green。今回のscanでは実行していない。
