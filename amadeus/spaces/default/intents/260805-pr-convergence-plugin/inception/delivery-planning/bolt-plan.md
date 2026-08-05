# Bolt Plan: PR 収束 opt-in プラグイン

上流入力(consumes 全数): requirements、components、unit-of-work、unit-of-work-dependency、unit-of-work-story-map

## Bolt 列(1 Unit = 1 Bolt、計3 Bolt)

### Bolt 1: `seam-bridge`(U1)— **walking-skeleton マーカー**

- **含む Unit**: U1 seam-bridge(C1 frontmatter parse/serialize+C2 overlay 結線 — unit-of-work.md の U1 定義)
- **walking skeleton**: 該当。証明するアーキテクチャ層 = manifest 宣言(compose)→ 実 frontmatter 書換え(serialize)→ compile の produces 反映 → `unitCovered` のデータ点火 → drop 復元、の end-to-end。self-feature スコープの greenfield 要素(engine 側唯一の要拡張点)であり、org.md / project.md の walking-skeleton 既定に従い最初の Bolt として単独・ゲート付きで実行
- **Definition of Done**: fixture plugin manifest による install→produces 反映→レポート不在で batch 非前進(落ちる実証)→drop 復元の E2E テスト green。parse→serialize 往復 byte-identity テスト green。未 install で全ステージファイル byte 不変。既存ブロッキングゲート全通過。PR 発行+収束+人間承認マージ
- **確信仮説**: 「compose の produces overlay は実ステージへ接続できる」— requirements A-2 の critical 前提が成立するか。不成立なら実装前停止して人間へ escalate(FR-2a)
- **期待デモ**: fixture manifest の compose 前後の `code-generation.md` frontmatter diff と、compiled graph の produces 差分、unitCovered の挙動差(レポート有無)

### Bolt 2: `convergence-toolchain`(U2)

- **含む Unit**: U2 convergence-toolchain(C3 述語+C4 台帳+C5 CLI+C6 gh 実行子)
- **Definition of Done**: 収束述語の4区分+UNKNOWN-retry+CLEAN 判定が fixture(実 PR 実測から採取した GraphQL fixture — A-1 の語彙実測込み)で決定的にテストされ、`replied-unresolved` fixture で赤(NFR-2)。台帳の機械導出(ページング・bot 判定・severity・終端処理)テスト green(NFR-3)。gh 実行子の4契約 assertion green。override の HUMAN_TURN 束縛テスト green。既存ゲート全通過。PR 発行+収束+人間承認マージ
- **確信仮説**: 「収束は GraphQL 実測から機械判定できる」— bot スレッドの4区分と mergeStateStatus 接地が実データで成立するか
- **期待デモ**: 実 PR に対する `status` verb の ConvergenceVerdict JSON 出力(violating 件数・区分内訳)

### Bolt 3: `plugin-packaging-e2e`(U3)

- **含む Unit**: U3 plugin-packaging-e2e(C7 工程断片+C8 センサー manifest+C9 plugin.json+NFR-1〜3 対実証)
- **Definition of Done**: `plugins/pr-convergence/` バンドルが compose/compile/run の3層 trust を通過。import 閉包検査(`assertPluginImportClosure`)green(NFR-4)。install/未 install の対実証(NFR-1)と受け入れ目安3項目の全実証。C8 センサーが plugin stage frontmatter 宣言と結線(同一 Bolt 内で C8 先行着地 — ADR-5 の順序制約)。`bun run build` で全ハーネス再生成成立(NFR-6)。既存ゲート全通過。PR 発行+収束+人間承認マージ
- **確信仮説**: 「install = opt-in 境界は可逆かつ未 install 無影響」— Issue #1971 の中核保証が全ハーネスで成立するか
- **期待デモ**: install → Bolt レポート削除で `next` が同 batch を再発出する実演(落ちる実証)と drop 後の produces 復元

## バッチ構成(bolt_dag 準拠 — runtime-graph.json compile 済み)

- Batch 1: Bolt 1(walking skeleton — 単独・ゲート付き。org.md 既定によりラダープロンプトは Bolt 1 出荷後)
- Batch 2: Bolt 2(Bolt 1 とファイル非交差だが、walking-skeleton 単独ゲートのため Bolt 1 承認後に開始)
- Batch 3: Bolt 3(Bolt 1+2 に依存 — unit-of-work-dependency の edge block どおり)

Bolt ごとに PR を発行しスカッシュマージする(team.md Way of Working — 複数 Unit の単一 PR 束ね禁止)。
