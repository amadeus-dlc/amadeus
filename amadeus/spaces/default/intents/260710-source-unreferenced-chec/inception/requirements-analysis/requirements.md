# Requirements — source-unreferenced-check (260710-source-unreferenced-chec)

> bugfix スコープ(enhancement P2 #735、ユーザー承認済みの bugs-only 例外)。上流トレーサビリティ: Issue #735(クロスレビュー2名 VERIFIED/CONFIRMED)+ #719(2層マスキングの全体像、2層目は #737 で解消済み)+ codekb(architecture.md「packaging 入力集合と source 側 unreferenced 検査」節、RE 2026-07-10 diff-refresh)。要件確定の根拠: requirements 選挙4問 = 全問 A(4票 = claude-engineer-3 / e1 / e4 / e6、2026-07-10 03:28 leader 集計 — 各 Q の確定内容は `requirements-analysis-questions.md` の `[Answer]:` 欄に記録、投票は agmsg ログおよび leader 台帳に実在)。
> 1 Bolt = 1 PR。修正前に赤・修正後に緑を実証する「落ちる実証」必須(Mandated)。

## スコープと非スコープ

- **スコープ**: `scripts/package.ts` に source 側 unreferenced ファイル検査を追加(#719 の2層マスキングの1層目の恒久是正)。対象は `packages/framework/harness/<name>/` 配下の全ファイル × 全 harness(claude / codex / kiro / kiro-ide)。
- **非スコープ**: `packages/framework/core/` の検査(coreDirs は buildTree が walk で全量読むため未参照が構造的に発生しない)。dist 側 orphan scan の変更(#711 で拡張済み・無変更)。`packages/setup` 等 harness dir 外。

## FR-1: buildTree の実読み集合の記録(選挙 Q1=A / Q2=A)

**契約**:
- FR-1.1: `buildTree` が build 中に実際に読んだ harness source のパス集合(以下「実読み集合」)を記録する。網羅対象: harnessFiles の列挙コピー(package.ts L357-363)、onboarding 合成入力(L370-376)、emit プラグインが読む入力、および **require/import 経由でロードされる build 機構ファイル**。build 機構3種の実ロード経路(実測): `manifest.ts` = `loadManifest`(package.ts:513-516)の `require()`、`onboarding.fills.ts` = 各 manifest.ts の静的 import、codex `emit.ts` = `harness/codex/manifest.ts:19` の静的 import で manifest ロードに連鎖して読み込まれる。**注意: package.ts:651 の `require(emit.ts)` は `codex trust` サブコマンド(別系統 CLI)の経路であり、build 経路の参照点ではない — 実装フックを :651 に置いてはならない。**
- FR-1.2: build 機構ファイルの記録は**静的な除外リストを新設しない**(選挙 Q2=A)。記録方法(require/import されたモジュールパスをどう実読み集合へ載せるか)は design/code-generation で明示的に設計する(選挙申し送り: manifest.ts は動的 require のため、モジュールロードの記録機構 — 例: manifest ロード箇所での明示記録 — を設計時に確定すること)。
- FR-1.3: 実読み集合の定義は write(`writeHarness` L544)/ check(`checkHarness` L561)の両経路で同一(buildTree 内で確定するため構造的に一致)。

**受け入れ基準**:
- AC-1a: Given 現行ツリー(post #737)。When 全 harness で実読み集合を導出する。Then `packages/framework/harness/<name>/` の全実ファイルが実読み集合に含まれる(= クリーンベースラインで検出ゼロ)。
- AC-1b: Given build 機構3種(manifest.ts / onboarding.fills.ts / codex emit.ts)。When 検査を実行する。Then これらは未参照として検出されない — **ハードコードのファイル名列挙によらず**、ロード記録経由で参照済みと判定される。

## FR-2: source 側 unreferenced 検査(選挙 Q1=A / Q3=A)

**契約**:
- FR-2.1: `checkHarness` 内で、`packages/framework/harness/<name>/` の実ファイル walk と実読み集合の差集合を計算し、差集合の各ファイルを problems 行(既存 `MISSING`/`DIFFERS`/`ORPHAN` と同形式の新種別、例 `UNREFERENCED in source: <name>/<rel>`)として報告する。
- FR-2.2: 検出時は既存 drift と同じ契約で **exit 1**(`bun run dist:check` の失敗として表面化)。warning 止まりにしない(選挙 Q3 で C を否決)。
- FR-2.3: 発火は `--check` 経路(checkHarness)。`write` 経路の挙動(生成物・exit 契約)は不変。
- FR-2.4: 検査は全 harness に適用し、harness 追加時に自動追随する(`discoverHarnessNames` L68-73 の既存発見機構を再利用)。

**受け入れ基準**:
- AC-2a: Given `packages/framework/harness/kiro/hooks/` に未参照ファイル(例: `stale-test.kiro.hook`)を注入。When `bun run dist:check`。Then exit 1、problems に当該ファイルの UNREFERENCED 行が含まれる。
- AC-2b: Given 注入を除去。When `bun run dist:check`。Then exit 0(クリーンベースライン復帰)。
- AC-2c: Given 現行ツリー(注入なし)。When `bun run dist:check` / `bun run promote:self:check` / 既存全テスト。Then すべて従来どおり緑(回帰なし)。
- AC-2d: **落ちる実証**: AC-2a の注入を検査実装前のコードに対して行うと緑(= #719 の偽緑の再現)、実装後は赤、除去で緑 — の3点を実測 exit code 付きで記録する。
- AC-2e: Given 4 harness いずれかの harness dir に未参照ファイルを注入(kiro 以外も1面以上)。When `--check`。Then 同様に検出される(全 harness 適用の実証)。

## FR-3: テスト(選挙 Q4=A)

**契約**:
- FR-3.1: unit テスト — 検査関数(差集合ロジック)を直接 import して検証: 未参照あり→報告、なし→空、build 機構ファイルの自動参照済み判定。
- FR-3.2: プロセス境界の注入実証 — 既存 `tests/smoke/t148` 同型(#737 の再注入ガードの先例)で、実ファイル注入 → `--check` 赤 / 除去 → 緑 を spawn で実証する(配置は t148 追記か姉妹ファイルかを実装時に既存構成へ整合)。
- FR-3.3: 既存スイート(276+ files)のグリーン維持。coverage registry の同期(新規ユニット検出時は再生成)。

## 横断要件(team.md / phases 準拠)

- NFR-1: 1 Bolt = 1 PR。PR 前に deslop 実施。レビューは領域内1+領域外1(クロスレビュー規則)、自己レビュー禁止。CI green + 人間承認マージ。
- NFR-2: `scripts/package.ts` は dev-only tooling のため dist/self-install への昇格対象外だが、検証として `bun run typecheck` / `lint` / `dist:check` / `promote:self:check` / `bash tests/run-tests.sh --ci` を最終変更後に再実行し実測 exit code を記録する(evidence-discipline)。
- NFR-3: 後方互換シム・要求外のフォールバック禁止。新設の problems 種別は既存の報告形式に整合させ、どのコードも消費しない「文書のふりをした」フィールド・レジストリを作らない(construction guardrail — 選挙 Q2=A の除外リスト不採用はこの原則の帰結)。
- NFR-4: 検査ロジックの説明コメントは関数外トップレベルに置く(bun lcov の in-function コメント DA:0 問題、Issue #730)。※ scripts/ は codecov ignore 対象のため patch には影響しないが、リポ内規約として統一。
