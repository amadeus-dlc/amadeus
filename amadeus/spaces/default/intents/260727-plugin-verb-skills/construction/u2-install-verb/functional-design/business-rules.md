# Business Rules — U2 u2-install-verb

上流入力(consumes 全数): requirements.md(FR-1、FR-5c)、components.md(C1)、component-methods.md(deps seam 2本)、services.md(exit code 体系)、unit-of-work.md(U2 完了条件)、unit-of-work-story-map.md(GWT)

## BR-U2-1: 衝突契約(Q2 裁定 A の機械化)

stagingEntryState の3値で分岐する: absent → 続行 / identical(全ファイルのバイト一致・集合一致)→ 冪等続行 / different → `--force` なしは loud 失敗。無音上書き経路を作らない。

## BR-U2-2: 原子的配置(swap 方式)

配置は copyPluginSource 既定実装の内部で「tmp へコピー →(--force 置換時のみ)dst を old へ退避 rename → tmp→dst rename → old 破棄」の swap で行う(business-logic-model.md Step 3 α〜δ)。dst に「半分だけの plugin」が現れる窓を作らず、--force の除去中断を含む全中間状態を dot-tmp 名前空間(tmp/old)に閉じる(split-widens-state-space の予防)。tmp/old は実行開始時に毎回破棄・再作成(前回残渣に依存しない)。seam 面は canonical の `copyPluginSource(src, dst)` 2引数のまま(component-methods.md C1 と逐語一致)。

## BR-U2-3: trust 境界不変

install は素材配置のみ。信頼判定・graph 反映は既存 compose 経路(handleCompose → trust 三層 → spawnRecompile 2段)へ委譲し、いかなる検証もバイパス・複製しない(C6 制約)。

## BR-U2-4: symlink の扱い

source 内の symlink は追わない(実体ファイルのみコピー、symlink はスキップし stderr に1行警告)。dangling/外部参照 symlink を staging へ持ち込まない(ADR-2 セキュリティ節)。

## BR-U2-5: 結果・exit code 契約(FR-1e)

成功 = `installed` kind、stdout に「<name> → <staging 先>、compose: <composed|noop>」を報告、exit 0。失敗 = failure variant(stage:"install" を5値へ追加)、exit 1。usage 誤り = exit 2。renderPluginCliResult の網羅 switch へ両 kind を追加(型で網羅強制)。

## BR-U2-6: テスト契約(FR-1f — 5ケース以上、in-process)

handlePluginCli 経由・実 FS tmp dir(integration 層): (i) 新規成功 (ii) identical 再試行(コピー省略の観測) (iii) different fail(exit 1+stderr 文言) (iv) --force 置換 (v) compose 失敗伝播(deps.recompile fake で失敗注入)。加えて tmp 残渣からの再実行収束 1ケース。

## BR-U2-7: INSTALL 文言(FR-5c)

plugin-projection.ts installDoc の folder-drop-auto / manual-only 2クラスへ「または `bun <harness-dir>/tools/amadeus-plugin.ts install <path>`」を追記(native-manifest は対象外)。dist/plugins の再生成を同一 PR に含める。
