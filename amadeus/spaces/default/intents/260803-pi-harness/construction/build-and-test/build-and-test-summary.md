# Build and Test Summary — Piハーネス正式対応

本書は8 Unitの実装をComprehensive戦略で検証した集約結果である。

## 実施範囲

- Build、型検査、lint、8ハーネスのpackage drift、self-install driftを検証した。
- Unit、integration、E2E、security regression、no-silent-drop、性能回帰、全CIを実行した。
- Pi 0.83 Extension Event、interactive-only human presence、RPC child driver、doctor、setup transaction、Pi Package、生成物、M1〜M10 conformanceを対象にした。
- macOSとLinuxの実Pi TUIで、project trust、番号付きgate、compaction、process restart、resume、doctorを検証した。
- macOSとLinuxのlive RPCで、multi-account自動選択とRPC非human境界を検証した。

## Readiness判定

- Build-ready: **Yes**。型、lint、package、self projection、複雑度、cast、no-silent-dropの全blocking gateが合格。
- Test-ready: **Yes**。781 files / 10,533 assertionsを実行し、機能失敗0。並列負荷で発生した既知の絶対時間フレーク1 fileは単独再実行16/16 passで解消を確認した。
- Formal Pi platform-ready: **Yes**。同一candidate commitのmacOS/Linux TUIとRPC、native Windows negativeを結合し、formal validatorが `status=green`。
- Deployment-ready: **No / 未判定**。本ステージは配布や本番導入を実行しない。

## 主要結果

- candidate commit: `55055f3888516efcc337dfffd9266ff5cff8eef6`。
- package drift: claude、codex、cursor、kimi、kiro、kiro-ide、opencode、piの8件すべてOK。
- lint: error 0、既知warning 392、info 23。
- no-silent-drop: `NO_SILENT_DROP_OK`、findings 0。
- Pi adapter性能: Kimi median 0.0007915 ms、Pi median 0.0009170 ms、上限100.0007915 msでPASS。
- macOS / Linux doctor: restart・resume後ともに36 passed / 0 failed。
- macOS TUI: human 11、gate approval 1、compaction 1。
- Linux TUI: human 15、gate approval 1、compaction 1。
- RPC: 両platformでhuman 0、gate approval 0、driver succeeded。
- multi-account: 両platformで `openai-codex-account-2/gpt-5.6-sol` を自動選択。

## 修復内容

- fresh scope routing、late continuation token、phase verification boundary、utility flag forwardingを修正した。
- Pi heartbeat、Linux journal同時刻順序、RPC lifecycle / settlement / cleanupを修正した。
- global `vendor/` ignoreでもOTel runtimeを候補commitへ含める配布ignoreを追加した。
- `.pi/tools/data/harness.json` をinstallerのowned / required receiptへ分類し、doctor契約と一致させた。
- test-size分類違反と新規complexity violationをbaseline追加なしで解消した。

## 制約と扱い

- AWS資格情報切れのlive SDK / Claude substrateテストはtyped skipであり、Pi formal evidenceには用いていない。
- 全CI並列時の `t07-hook-audit-logger` 絶対時間フレークは、直前runでは合格し、直後の単独runでも113 ms / 103 msで合格した。機能回帰として扱わない。
- credential、trust store、raw provider output、raw transcriptは保存していない。一時formal evidenceとTUI raw dataはcommit対象外である。
