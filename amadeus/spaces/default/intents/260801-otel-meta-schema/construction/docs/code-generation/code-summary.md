# Code Summary — U6 docs(Bolt 4)

上流入力(consumes 全数): code-generation-plan.md、functional-design 3成果物、nfr-design 5成果物 — 実装は plan の経過どおり、裁定3件+執行裁定(B'')の範囲内。

## 着地

- **PR [#1938](https://github.com/amadeus-dlc/amadeus/pull/1938) — MERGED**(スカッシュ、origin/main で 23-telemetry-schema.md の実在確認済み)。**全 Bolt(1/2a/2b/2c/3/4)着地完了**

## 変更面

- 新設: `docs/reference/23-telemetry-schema.md` + `.ja.md`(対訳ペア、6節 1:1、Log 節なし、count-free、引用80件実測、docs/README 索引 en/ja)
- 是正: span キー **amadeus.intent.id** へ改名(repo 全域旧キー残存 0)
- 追加: **amadeus.bolt / amadeus.unit**(span 閉語彙 8キー化)— fork(bolt/swarm、--unit discriminator)が untracked マーカー `.amadeus-bolt-context` へ書き、resolver が worktree-local に読む(fail-open、git check-ignore 実測で travel 構造的不能)
- seam 抽出(amadeus-observability.ts へ boltContextKind/writeBoltContextMarker — spawn 盲点 9→6行)+残6行のみ reason 付き allowlist

## 検証実測

- typecheck / lint / dist(7ハーネス)/ promote:self / dist:check / promote:self:check / complexity / patch gate(uncovered 0)/ run-tests --ci = 全 exit 0
- 落ちる実証: fork 書込除去 → 書き手テスト赤(発火しない supplier の否定)
- en/ja 対称機械照合(H2/H3/表行/引用集合 diff 完全一致)。allowlist は 3-stage 再構成+provenance 別 remap
- 独立 PR レビュー: iteration 1 REVISE → 増分再確認 **READY(GoA 1)**。referee check converged / tampered=false
