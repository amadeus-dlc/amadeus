# Requirements — source-only 構成への移行と Release Asset 配布

上流入力(consumes 全数): intent-statement(裁定 G1〜G13 と成功指標の正本 — Intent Analysis 節で参照)、scope-document(In/Out 境界と制約 — Constraints / Out of Scope 節で参照)、business-overview(業務境界への影響が導入経路の一点に限られる判断 — Intent Analysis 節で参照)、architecture(配布境界の患部機序 — Functional Requirements 節の file:line 出典)、code-structure(患部 B1〜B11 の配置と区間 touch 判定 — Functional Requirements 節の file:line 出典)。team-practices は optional consume で不存在(practices-discovery SKIP)— 規範は memory 層(org/team/project)を直接参照。

測定 ref: 特記なき file:line は observed `63e69d922`(codekb 現在節・`re-scans/260802-source-only-dist.md` と同一断面)。

## Intent Analysis(意図分析)

intent-statement.md の Problem Statement のとおり、三層追跡(正規ソース 544 / dist 3,846 / self-install 6面 2,601)の実害4点(レビュー差分の投影支配・再生成漏れ・byte 同期化した検証・肥大化)を、**ランタイム挙動を変えずに配布境界だけを変えて**解消する。business-overview.md 現在節の判断のとおり、利用者価値への影響は導入経路の一点(codeload 内 dist 読取 → Release Asset)に限られる。確定済み裁定 G1〜G13(intent-statement 裁定表)+ 本ステージ Q1 裁定を要件の前提とする。

## Functional Requirements(機能要件)

### FR-0: scope 正本昇格(移行順序 0)

- FR-0.1: `amadeus-self-{feature,fix,refactor,document}.md`(dot 5面に存在)+ `amadeus-installer-distribution.md`(現状2面のみ)を `packages/framework/core/scopes/` 相当の正本へ昇格し、生成器の投影対象に含める。**installer-distribution は全 dogfood 面へ揃える(Q1 裁定 — 面別例外機構は新設しない)**
- FR-0.2: scope-grid の root-only 5キー(self-* 4 + installer-distribution。root 15 vs dist 10 — code-structure.md B10)を正本 grid へ昇格し、全面で15キー同一にする
- FR-0.3: `packages/framework/core/sensors/amadeus-self-scope-consistency.md` センサーの期待を昇格後の対称構造に追随させる
- 受け入れ: クリーン checkout からの生成で self-* / installer-distribution scope が全面に再現される(#2043 AC ステップ0)

### FR-1: Release Asset 生成・公開(移行順序 1、G6/G9)

- FR-1.1: リリース CI で全ハーネスを生成し `amadeus-dist-vX.Y.Z.tar.gz`(全ハーネス同梱の単一 tar)+ SHA-256 checksum + manifest を公開する
- FR-1.2: tar は codeload 同一の wrapper 契約(単一トップレベルディレクトリ)。`resolveWrapperDir`(payload-factory.ts:12)は無改修で両経路を処理できること
- FR-1.3: release.yml の `github-release` ジョブ(現状 :133-158 — checkout/bun/build なし、softprops 入力3つで `files:` なし)へ build + `files:` を追加。**workflow_dispatch 一本の人間承認境界は不変**(project.md Mandated)
- FR-1.4: asset 生成前にフルテストと再現性検査(隔離2回 build 比較)を通す

### FR-2: installer の asset 経路(移行順序 2、G7)

- FR-2.1: `@amadeus-dlc/setup` は対象バージョンが `>= 導入版定数` なら Release Asset を取得し checksum 検証後に展開。asset 欠落・checksum 不一致は fail closed(黙って codeload へ落ちない)
- FR-2.2: `< 導入版定数` は codeload 直行(現行経路 — resolved-version-factory.ts:5 CODELOAD_BASE)。判定は semver 比較の純粋関数でネットワーク非依存
- FR-2.3: `ALLOWED_HOSTS`(http.ts:5、現在2ホスト)へ asset 配信ホスト(リダイレクト先含む)を追加。redirect 検査(:79)の fail-closed は維持
- FR-2.4: ADR-003(resolved-version-factory.ts:4)を改訂し、代替案2件以上のトレードオフ分析を含める(inception 規範)
- FR-2.5: checksum の役割分担(転送破損検出 — 改竄耐性は HTTPS + host allowlist)を設計成果物に明記

### FR-3: 開発時生成と bootstrap(移行順序 3、G1/G2)

- FR-3.1: 単一コマンド(`bun run build` 等)で dist + self-install 面を生成。同一入力での再実行は冪等(`git status` 不変)。**build は追跡ファイルを書き換えない**
- FR-3.2: 単一ディスパッチャ(G1): `.claude/settings.json`(追跡継続)の11フック参照(settings.json :57-:154、実体13本中11本参照 — code-structure.md B8)を追跡された dispatcher 1ファイル経由に改修。実体不在時は no-op + `bun run build` 案内を stderr へ出す
- FR-3.3: AGENTS.md import 参照方式(G2): 追跡する AGENTS.md は手書き部(1-91行)+ import 行(:1)のみに固定し、生成 suffix(:92-162、12,954B)は未追跡の `.agents/` 配下へ移して import 参照。`PROJECT_INSTRUCTIONS` 定数(promote-self.ts:65-74)の正本を `packages/framework/harness/**` へ移設
- FR-3.4: 生成処理は allowlist・per-user ランタイム(第3カテゴリ)・稼働中 `.claude/worktrees/` を削除しない
- FR-3.5: onboarding 手順(clone → `bun install` → `bun run build` → ハーネス起動)を README / CONTRIBUTING に固定

### FR-4: CI 再設計(移行順序 3、G4/G5)

- FR-4.1: build-before-test(G4): テスト本体(dist 参照 **423 ファイル** — 実測は #2043 記載の373から増加)は無改修。`tests/run-tests.sh` / CI 入口に「dist 不在なら loud fail + build 案内」ガードを置き、CI は全ジョブ前段に build ステップを追加
- FR-4.2: `dist:check`(ci.yml:243-244)/ `promote:self:check`(ci.yml:246-247)を「コミット済みコピーとの parity」から「隔離2回 build の再現性比較」へ置換
- FR-4.3: 第3ガード(ci.yml:254-255 `amadeus-graph.ts compile --check`)は「正本から compile が成功しグラフ不変量(未知 sensor 拒否等)を満たす」検証へ意味を再定義(G5)。自己参照比較(検証劇場)への退化を禁止し、CI はガード実行前に生成完了済みであること
- FR-4.4: `detect-ci-changes.sh` の drift フィルタ(:18-24)を改訂(dist/* の死にパターン化への対応、`.kiro/*` ルート面不在の既存不整合の是正、`.kiro-ide` パターン不在の点検)
- FR-4.5: 生成対象ディレクトリが誤って追跡・stage された場合に失敗する境界ガードを追加(落ちる実証必須)

### FR-5: Git 追跡除外(移行順序 5、G8)

- FR-5.1: `dist/**` + self-install 面(allowlist・第3カテゴリ除く)を追跡除外。`.gitignore` の COMMITTED 契約(:16-19)を反転
- FR-5.2: allowlist の正本を packages/framework 配下のデータ1箇所に置き、`promote-self.ts` の `preserved`(:101-114)はそこから import。`.gitignore` / `.gitattributes` は手書き維持のまま**整合テスト(落ちる実証必須)**で一致を強制(G8)
- FR-5.3: `.gitignore` allowlist は深さ制約に従う(深さ1限定、深さ2以上(dispatcher フック等)は階層再包含パターンを明示)
- FR-5.4: `promote:self` の責務を「コミット済み mirror との drift guard」から「ローカル self-install 生成」へ変更

### FR-6: 文書・規範(移行順序 6、G3)

- FR-6.1: README / README.ja / CONTRIBUTING / 各ハーネスガイド / リリース手順 / `.gitattributes` / `.gitignore` 契約コメント / AGENTS.md:90 の手編集禁止文言を新境界へ更新
- FR-6.2: 規範衝突5点(#2043 記載)のノルム PR を norm-changes-via-pr で実施。G3 の受容論証(dist 手編集の伝播経路 — git 追跡・release asset — が構造的に閉じること)を設計成果物に明記し、当該 Forbidden を削除

## Non-Functional Requirements(非機能要件)

- NFR-1(再現性): 同一 commit・同一 toolchain の隔離2回生成が byte-identical。既存性質(build スクリプトに非決定性の種ゼロ、Linux CI が macOS 生成 dist と byte 一致)の検査形式変更であり新規リスクではない
- NFR-2(冪等性): 生成の再実行で `git status --short` がクリーン(追跡ファイル不変)
- NFR-3(fail-closed): asset 欠落・checksum 不一致・ホスト逸脱・境界ガード違反はすべて loud fail。silent fallback / fail-open 退化(architecture.md 現在節が指摘する drift guard の意味変化)を作らない
- NFR-4(承認境界): リリース実行(workflow_dispatch)・PR マージ・ノルム PR マージの人間承認境界を全経路で維持
- NFR-5(テスト空白の充足): release.yml の github-release ジョブ(code-structure.md B4 — checkout/bun/build なし・`files:` 入力なし)を検証する既存テストは tests/ に存在しない — asset 生成面には検証(最低限、asset レイアウト・checksum 整合の機械検査)を新設する

## Constraints(制約)

- 移行順序 0→6 厳守(scope-document.md 制約節): 追跡除外(FR-5)は FR-1〜FR-4 完了+クリーン環境検証後。ステップ0省略は self-* scope の恒久喪失
- 期日なし(scope-definition Q1 裁定)。品質・順序優先
- 単一 intent で完遂(cid:intent-capture:c4-2)。並行化は Unit / Bolt swarm で行う
- 正本編集は `packages/framework/**`、dist / self-install は生成物(現行 Mandated — 移行後も編集正本の原則は不変)

## Assumptions(前提)

- A-1: asset 配信ホストのリダイレクト先は GitHub 管理ドメインに閉じる(実装時に実測で確定 — external-seam 実測規範)。確信度: 高
- A-2: 全ハーネス単一 tar(約42M)は GitHub Release Asset のサイズ制限(2GB)に対し十分小さい。確信度: 高
- A-3: promote-self.ts:357 の再帰 build 内包(check が build を含む)により、build 前提化の実装コストは新規 build 機構の発明ではなく既存経路の再配線で足りる。確信度: 中(設計段で実証)

## Out of Scope(スコープ外)

scope-document.md の Out 節(Won't 9項目)を正とする — ランタイム挙動変更 / ハーネス出力の意図的変更 / プロジェクト固有設定の廃止 / 履歴書き換え / `amadeus/` ツリー / composed scope 再現 / テストの source 直参照化 / per-harness asset 分割 / #1865。

## Open Questions(後続ステージへ送る未決)

いずれも設計ステージの管轄(要件レベルでは未決のまま送る):

- OQ-1: manifest の具体スキーマ(ファイル名・checksum 形式・対象一覧)— application-design
- OQ-2: `ALLOWED_HOSTS` へ追加する具体ホスト名(リダイレクト先の実測を含む)— application-design / 実装時実測
- OQ-3: release.yml のジョブ構成(既存 github-release への build 追加 vs `build-dist` ジョブ新設 + needs)— application-design
- OQ-4: 第3ガードのグラフ不変量の具体集合 — functional-design
- OQ-5: ノルム PR 5点の文面と分割 — FR-6 実施時(norm-changes-via-pr)

## Review — Iteration 1

- **Verdict:** READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-08-02T17:38:56Z
- **Iteration:** 1
- **Scope decision:** none

G1〜G13裁定・scope-document・codekb(B1〜B11)の引用は実測整合、必須7節・上流参照・E-OC1証跡を充足。Minor 2件(NFR-5 の宣言外 consume 引用、FR-4.2 の結合範囲表記)は conductor が是正済み

### Findings

- Minor: NFR-5 の根拠引用が宣言外 consume(code-quality-assessment.md)を参照 — code-structure.md B4 由来の記載へ差し替えで是正済み
- Minor: FR-4.2 の ci.yml:243-247 結合表記 — :243-244 / :246-247 へ分離是正済み
