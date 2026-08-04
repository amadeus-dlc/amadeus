# RE 差分リフレッシュ記録: 260804-live-e2e-phase2

## 実行メタデータ

- Date: `2026-08-04`
- Base commit: `9458bbda85eb7257310a80882b4858dc6ce3d1fc`
- Observed commit: `499d706a25f3cc2cc0c2b1671dc4b282e3a818e1`
- Repository: `amadeus`
- Project type / scope / depth: Brownfield / `self-feature` / Standard
- Test strategy: Comprehensive
- Focus: Kimi Code print driverとKiro CLI ACP/TUIを、既存common live E2E policy/lifecycleへ接続するための実装、テスト、配布物、認証・設定・child environment境界、CLI能力の実測。
- Out of scope: Kiro IDE GUI/CDP、Cursor、OpenCode。

## Base選定

このIntentにはprior re-scanが存在しなかった。最新の他Intent record `260804-evidence-revision-rebind.md` のobserved `9458bbda...`について、`git merge-base --is-ancestor 9458bbda... HEAD`がexit 0、`git rev-list --count 9458bbda...HEAD`が7だったためbaseに採用した。共有`reverse-engineering-timestamp.md`はbase sourceに使用していない。

## 差分区間

baseからHEADの主要7コミットは、common live E2E kernel（`12bf94ea6`）、test runtime短縮、settings更新、Issue template変更、no-silent-drop evidence rebind、Pi core support、review fixである。Phase 2に最も重要なのは`12bf94ea6`で、`tests/harness/live-e2e/`一式、Codex/Claudeの4 adapter、unit/serial e2e、`docs/harness-engineering/live-e2e.md`を導入した。

Kimi/Kiro harness sourceとlegacy driversはこのbase..HEAD区間で変更されていない。従って本Intentの接続作業は、新設common kernelを既存Kimi/Kiro実装へ適合させるincremental integrationである。

## Kimi実測所見

- Installed CLI: `kimi 0.31.1`。distribution prerequisite `>=0.29.0`を満たす。
- `tests/harness/kimi-print-drive.ts`は`kimi -p`、tmp `KIMI_CODE_HOME`、managed model config、source `credentials`/`oauth`へのsymlinkを実装する。
- legacy opt-inは`AMADEUS_KIMI_PRINT_LIVE=1`だが、GitHub Actions hard denyとcanonical skip codeはない。
- `runPrintSession`は`env: { ...process.env, ...(args.env ?? {}) }`でchildを起動し、共通env allowlistを満たさない。
- `packages/framework/harness/kimi/manifest.ts`、setup Kimi hook merge、`scripts/promote-self.ts`により配布/導入seamは既にある。

推奨接続seamは、legacy primitiveを`LiveAdapter`へ包み、credential symlink・scratch home・child processをresource registrarへ登録し、`buildChildEnvironment`でchild envを新規構築することである。

## Kiro CLI実測所見

- Installed CLI: `kiro-cli 2.13.0`。top-level helpで`chat`、`agent`、`doctor`、`settings`を確認した。既存doc prerequisite `>=2.6`を満たす。
- ACP driverは`kiro-cli acp --agent ...`をnewline JSON-RPCで駆動し、initialize/session/new/session/prompt/session/cancel、tool updates、permission requests、deterministic `stopAfterToolTitle`を実装する。
- ACP `Bun.spawn`に明示env/homeがなくambient process environmentを継承する。timeout時はcancelするが、common process-resource cleanup receiptには接続されていない。
- TUI driverはprivate tmux serverを使い、paneとdisk stateを観測する。起動shellはambient env/homeを継承し、common run-private resource registry/ledgerへ未接続。
- ACP/TUIの各testは`AMADEUS_KIRO_*_LIVE`、binary、`whoami`、distを個別自由文で検査し、canonical taxonomyとCI hard denyを使わない。

ACPは構造化anchorのため第一候補だが、Kiro認証・設定をsource path非漏洩のscratch境界へ渡す正式手段は現行コードから確定できない。これをruntime probeで確定できなければ、阻害要因・推奨seam・受入条件付き後続Issueへ接続する。

## Common contractとのギャップ

`registry.ts`の`LiveAdapterId`と`LIVE_CAPABILITIES`は`codex-exec`、`claude-print`、`claude-sdk`、`claude-tui`のみ。matrixも同じ4行で、`runs.jsonl`は0行である。Kimi/Kiroを追加するにはregistry、adapter、journey、contract/fault tests、serial live entry、runbook/matrixを同期する必要がある。

共通policy/lifecycleの次の契約は弱めない: `GITHUB_ACTIONS=true`のzero-spawn、exact opt-in、canonical status/code、child env allowlist、source auth/config path非漏洩、timeout/failure区別、cleanup barrier後のledger append、bounded sanitized evidence。

## 未知点と後続確認

- Kiro CLI 2.13.0のcredential/config保存面とscratch-safe binding。
- Kiro ACP/TUIのchild process treeをabort/kill/reapする正確な境界。
- fresh HOMEでのKiro native login再利用可否。
- Kimi symlink cleanup後のdescendant handle/leak挙動。
- Observed revisionでのKimi/Kiro common-kernel live green。今回のscanでは課金liveを実行していない。

## CodeKB更新

共有9成果物をObserved HEADのcurrent viewへ再構成し、本re-scanへIntent固有のbase、focus、所見、未知点を保存した。過去Intentの詳細は既存`re-scans/`に保持される。
