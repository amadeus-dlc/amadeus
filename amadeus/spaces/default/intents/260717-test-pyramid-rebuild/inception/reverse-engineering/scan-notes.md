上流入力(consumes 全数): なし(本ステージは consumes 宣言なし)

# reverse-engineering スキャンノート — 260717-test-pyramid-rebuild(#684)

## 測定 ref とメタ

- 手法: 決定的分類スイープ(classifyTestSize 直叩き — LLM fan-out でなく既存決定的関数を全数適用。判定ブレゼロ)+ codekb フォーカス面
- observed: `d151561d8d9b7a01fa4f16d47da5434486a2e9e2`(git rev-parse HEAD 実測、origin/main a4a33e59a 再接地後。RE diff-base — rescan-base-ancestry)
- tier 開放スイープ measurement ref: `3917a283a953165866170d235d3dc25ad2fd3643`(classifyTestSize 全域再帰スイープ実測。E-TPR-NR1 裁定で台帳を tests/ 全域再帰・tier 開放へ変更)
- 測定対象: tests/ 全域再帰(既存 test_pyramid コレクタ scripts/metrics-snapshot.ts:34-40 walk / :99 と同型の無制限再帰列挙)= **442ファイル**。**enumeration-completeness 是正**: 初稿の「tests/{unit,integration,e2e,smoke}/*.test.ts の 4 named subdir 限定 = 440」は observed の不完全列挙であり、tests/ 直下 harness/lib 配下の2ファイル(各 tier 1件)を取りこぼしていた。既存コレクタが全域再帰する以上、台帳も全域再帰で一致させる

## テストサイズ分類台帳(計測導出 — 検証劇場禁止)

分類器 classifyTestSize(関数 tests/lib/test-size.ts:49、型 TestSize :23)の SIGNAL_PATTERNS(:35-40 verbatim):
- **network → large**: node:net/http/https/http2/dgram/tls・WebSocket・fetch(・.listen(
- **spawn → medium**: child_process・spawnSync・spawn(・execSync・Bun.spawn・node-pty
- **filesystem → medium**: node:fs・readFileSync・writeFileSync・mkdtempSync・rmSync 等
- **timer → medium**: setTimeout・setInterval・Bun.sleep・await sleep(
- signal なし → small。size = max(検出 signal のサイズ)、コメント/prose は strip 済み(:52)

### tier × size マトリクス(実測)

| tier | small | medium | large | 計 |
|---|---|---|---|---|
| unit | 48 | **162** | 1 | 211 |
| integration | 9 | 138 | 0 | 147 |
| e2e | 3 | 63 | 2 | 68 |
| smoke | 0 | 14 | 0 | 14 |
| harness | 0 | 1 | 0 | 1 |
| lib | 0 | 1 | 0 | 1 |
| **計** | **60** | **379** | **3** | **442** |

tier は閉じた4層列挙ではなく、tests/ 直下サブディレクトリ由来の**開いた集合**(既知の4 named tier {unit|integration|e2e|smoke} + harness/lib 等の補助 tier)。size ピラミッド規約は 4 named tier のみに課し、**harness/lib は補助 tier として台帳に可視化するが規約対象外**(反証可能根拠: これらは size ピラミッドの層序を持たない補助分類であり、4 named tier のみが規約の対象)。

**核心所見**: サイズ観点で **medium 379件(85.7%)偏重**のアイスクリームコーン型(比率は全 442 に対して算定)。理想ピラミッド(small 多数→medium→large 少数)と真逆。

## サイズ違反候補(unit tier の非 small)

- unit 211件中 **163件が非 small**(medium 162+large 1)= サイズ観点の層違反疑い
- 違反 signal 内訳(重複計上): **filesystem 153 / spawn 99 / network 1 / timer 1** — unit 層の medium 化の主因は **FS 使用(readFileSync 等の fixture I/O)**、次いで **spawn(CLI/hook を子プロセス起動して検証)**
- これらが移設是正(別 intent)の主対象。in-process seam(関数直接呼び出し)化で small 化できるものが多数見込み(既存 seam-export 系ノルムの適用対象)

## size 宣言の実態

- `// size:` 宣言あり = **53件** / 宣言なし = **389件**(大半が未宣言。全域再帰 442 − 宣言 53 = 389。harness/lib の2ファイルは無宣言 — grep 実測)
- **declared<measured のドリフト = 0件**(既存 size ドリフトゲートは全 green — 宣言済み分は measured 以上を宣言しており、上方向ドリフトは発生していない)

## 既存基盤(フォーカス面)

- classifyTestSize / SIZE_ORDER / SizeClassification(tests/lib/test-size.ts、291行)
- test_pyramid コレクタ(scripts/metrics-snapshot.ts:97-104、`${tier}_${size}` 集計)
- size ドリフトゲート(declared<measured で CI 赤)
- run-tests.sh(tests/run-tests.sh、smoke/unit/integration/e2e の POSIX ラッパー)

## codekb 更新方針(diff-refresh・churn 回避)

本 intent のフォーカス面(テスト分類基盤)は code-structure の「テスト構成面」節へ新設。body 他成果物は温存(c1)。台帳の全 442 行データは scratch(tpr-ledger.json)に保持し、要点(マトリクス・違反内訳)を本 scan-notes へ。

## 後続への引き継ぎ

- requirements: 比率目標(現状 small 13.6%→理想値)・実行時間予算・移設対象選定基準は選挙(U-1/U-2/U-3)
- units-generation: U1 台帳(本 scan-notes のマトリクス+全行台帳)/ U2 層設計・比率 / U3 移設 Issue 分割
