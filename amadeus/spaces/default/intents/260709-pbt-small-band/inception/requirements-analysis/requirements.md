# Requirements — pbt-small-band(#697 = #684 Phase B: Small band 育成 + PBT 導入)

## Intent 分析

テストピラミッドの Small band を育てる: spawn/FS ベースの旧 unit テストから純関数 seam を抽出して in-process の Small テストを増やし、あわせてプロパティベーステスト(fast-check、#688 方針)を導入して example-based では拾えない入力空間の欠陥検出を得る。**bugs-only スコープの P0 例外**(#684 Phase B 系列、2026-07-09 ユーザー裁定)— 例外根拠は intent 誕生 arguments に記録済み。

上流: codekb(re-scans/260709-pbt-small-band.md、observed 9a2f5c72)の business-overview.md / architecture.md / code-structure.md、および RE 合成(prior 有効・焦点領域の直近変更ゼロを実測)。

## 機能要件

### FR-1: fast-check 導入(基盤)

- FR-1.1: `fast-check` を**ルート package.json の devDependencies**にのみ追加する。出荷フレームワーク(dist/セルフインストール)へのランタイム依存は追加しない。
- FR-1.2: PBT 規約を確立する: (a) PR CI では固定シード+既定 numRuns(秒単位)で実行、(b) 失敗時に seed / counterexample を必ず出力、(c) shrink 済み反例は example-based テストとしてピン留めコミットするワークフローをテスト内コメントまたは規約文書で明示、(d) 生成器(arbitrary)はドメイン型ごとにテスト側ヘルパーとして併置(brand 型のスマートコンストラクタを迂回して無効状態を生成しない)。
- FR-1.3: 深掘り実行(高 numRuns)は既存 `--release` テスト層に接続する(新設 CI ジョブは作らない — 既存インフラ再利用)。
- FR-1.4: 受け入れ基準: PR CI 相当(`bash tests/run-tests.sh --ci`)での PBT 追加後の実行時間増を**修正前後の実測比較で +60 秒以内**に収める(numRuns の具体値は OQ-1 でこの閾値から逆算して確定する — 閾値を超える numRuns 設定は採らない)。固定シードで再現可能なことを、意図的に壊したプロパティで seed 再現→修正の一連を1回実証(落ちる実証)。

### FR-2: semver / version-spec の PBT(第一候補)

- FR-2.1: `packages/setup/src/domain/semver.ts` に対し、parse 律(roundtrip: format∘parse、不正入力の Result エラー)と比較律(反射・反対称・推移)のプロパティを追加。**全順序プロパティは stable バージョン集合に閉じる**(prerelease は同 major.minor.patch で非比較 — `semver-factory.ts:20` 実測)。
- FR-2.2: `version-spec.ts` は SemVer.parse に閉じる smart constructor として、有効/無効入力の分類プロパティを追加。
- FR-2.3: 既存 `tests/unit/setup-semver.test.ts`(既に Small・in-process)へ追記または隣接ファイルで追加。赤の実証: プロパティを一時的に誤定義して落ちること、または既知バグクラス相当の変異で落ちることを1例示す。

### FR-3: manifest の roundtrip PBT

- FR-3.1: `manifest.ts` の build→toJSON→parse roundtrip と重複 path 拒否の不変条件をプロパティ化(FS ゼロ、in-process)。
- FR-3.2: 既存 `tests/unit/setup-manifest.test.ts` の Small 性を維持。
- FR-3.3: 落ちる実証(NFR-3 判定): roundtrip または重複 path 不変条件を意図的に破る変異(例: toJSON の path 重複排除を外す)でプロパティが赤くなることを exit code 付きで実証してから完成扱いにする。

### FR-4: plan.ts 純判定 seam の抽出 + Small テスト

- FR-4.1: `plan.ts` の純判定関数(`classify:227-233` / `classifyAction:162-168` / `toPlanAction:209-218`)を**モジュールレベル named export** として公開し(Q5 回答)、FS 依存(readdirSync/statSync/openSync 経路)は seam の外に残す。
- FR-4.2: 抽出した seam に in-process Small テスト(+分類の網羅プロパティ)を追加。既存の FS ベース plan テスト(mkdtempSync 使用)は残置(medium のまま)。
- FR-4.3: 挙動不変: 既存 plan 系テストがグリーンのまま(リファクタの受け入れ基準)。
- FR-4.4: 落ちる実証(NFR-3 判定): 分類プロパティが seam の判定変更(例: classify の1分岐を反転する変異)で赤くなることを exit code 付きで実証する。

### FR-5: audit-escape の PBT(独立 Bolt、コア波及あり)

- FR-5.1: `amadeus-audit.ts:295` のインライン CR/LF エスケープを純関数として抽出・export し、roundtrip/不変条件プロパティを追加(t111.test.ts:227-270 の example を一般化)。
- FR-5.2: コア変更のため `bun scripts/package.ts` + `bun run promote:self` を同一コミットに含める(Mandated)。
- FR-5.3: t111 の既存アサーションはグリーン維持。
- FR-5.4: 落ちる実証(NFR-3 判定): エスケープ不変条件が実装の変異(例: CR エスケープの除去)で赤くなることを exit code 付きで実証する。

## 非機能要件

- NFR-1: PR/CI 基準(typecheck / lint / dist:check / promote:self:check / run-tests --ci)全 exit 0。
- NFR-2: **in-process 計測の担保**: PBT/Small テストは spawn ではなく in-process で対象コードを実行する(Corrections「bun --coverage は spawn サブプロセス非計測 → in-process seam」準拠)。codecov/patch(新規行 100% target)を通す。
- NFR-3: トートロジー禁止: 実装をそのまま写像しただけのプロパティ(x===x 型)を書かない。プロパティは実装と独立に定義できる法則(roundtrip・順序律・分類全域性)に限る(検証劇場 Forbidden)。
- NFR-4: Small≥90 は milestone であり本 intent の hard gate ではない(#697 明記)。達成度は build-and-test summary で実測報告。

## 制約

- C-1: Bolt 分割(並列可): B1=fast-check 基盤+semver/version-spec(FR-1+FR-2)、B2=manifest(FR-3)、B3=plan seam(FR-4)、B4=audit-escape(FR-5、コア波及のため独立)。B2/B3 は B1 の fast-check 導入コミットに依存 — B1 の PR を先行させるか、各 Bolt が同一 devDependency 追加を持ち衝突しないよう B1 マージ後に rebase する(マージランブック方式)。
- C-2: Bolt ごとに PR/スカッシュマージ、codex 直接レビュー、マージ人間承認(通常運用)。
- C-3: 出荷物への影響: B4 以外は tests/ と packages/setup のみ。B4 のみ core 波及(dist/promote 同期必須)。

## 前提

- A-1: fast-check は bun test と追加設定なしで動作する(TS/ESM ネイティブ)。動作しない場合はブロッカー選挙へ。
- A-2: size 分類器(Issue #696 Phase A、**PR #700** でマージ済み — #700 は Issue ではなく PR 番号)は追加テストを自動で Small 判定する(in-process・spawn/FS なしのため)。分類器の挙動が想定と異なる場合は注釈で明示。

## スコープ外

- Small≥90 の完全達成(milestone であり本 intent の完了条件ではない)
- #688 の「本格導入」全域(夜間 CI 新設等) — 既存 --release 層への接続まで
- plan.ts の FS 依存部の Small 化(fake FS 導入等) — seam 抽出のみ
- agmsg skill 側の `_actas_lock_encode`(本 repo に不在 — codex-3 補正で除外済み)

## 未解決事項(後続へ)

- OQ-1: numRuns の具体値(PR CI 既定 / --release 深掘り)— code-generation で実測時間に基づき確定(FR-1.4 の時間制約から導出)。
- OQ-2: B4(audit-escape)の抽出関数の置き場所(amadeus-audit.ts 内 export か amadeus-lib.ts か)— 実装時に既存構造へ倣う。
