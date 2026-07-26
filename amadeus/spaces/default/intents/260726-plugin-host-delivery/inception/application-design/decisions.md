# Design Decisions(ADR)— plugin-host-delivery

> 上流入力(consumes 全数): requirements、architecture、component-inventory、team-practices
> 各 ADR は Context / Decision / Consequences / Alternatives Rejected+セキュリティ影響を含む(inception.md Architecture Standards)。ADR-1 は本ステージ承認ゲートがそのまま裁定(intent-capture Q3・requirements FR-7)。

## ADR-1 formal-model-check activation policy【裁定済み: 案 A 採用 — ユーザー直接裁定 2026-07-27、application-design 承認ゲート】

**Context**: requirements FR-7 は (a) インストール = opt-in 境界 (b) 既存 scope への無条件追加不可 (c) 決定的 (d) Amadeus 独自設計、の 4 条件を固定。TLC 探索は高コスト(two-layer-verification-posture: 「並行プロトコルの spec 変更時のみ」が既決の検証態勢)。上流は `when:` 未評価のため参照実装なし。

**Decision(推奨案 A)**: **spec 変更検出の決定的ゲート**。インストール(compose 済み)を前提に、(1) `--stage formal-model-check` の明示起動から `--single` 要求を撤廃(compose 済みなら通常 single-stage 実行として成立) (2) 加えて構成ファイル(plugin 側で宣言する監視対象 glob — 既定 `specs/tla/**`)の内容ハッシュが最終 verdict 記録時と異なるときのみ、construction の build-and-test 段で「formal-model-check の実行を推奨する」ことを engine の advisory(stderr)+doctor 行で提示する。**自動実行はしない**(コスト管理は人間の起動判断に残す)。ハッシュ照合は決定的で、判定・非発動時挙動は doctor で常時観測可能。

**Consequences**: `--single` 必須 UX は解消(成功指標 8)。TLC が勝手に回ることはなく、spec 変更の見逃しは advisory + doctor で防ぐ。engine 変更は advisory 提示と single 要求撤廃の 2 点に留まり、`when:` 一般評価エンジンを作らない(非目標整合)。

**Alternatives Rejected**:
- **B: scope 恒常編入**(compose 時に対象 scope の EXECUTE へ常時追加)— FR-7(b) に正面から抵触。全ワークフローが TLC コストを負う。却下
- **C: 現状維持(`--single` 必須)**— 成功指標 8 未達。却下
- **D: spec 変更検出で自動実行**(advisory でなく実行)— 決定的だが、CI/セッションに分単位の TLC 実行を自動注入し起動レイテンシ・コスト管理(NFR-2)と衝突。人間の起動判断を残す A を優先。却下

**セキュリティ影響**: 発動判定はローカルファイルのハッシュ照合のみで外部入力なし。plugin 宣言 glob は compose の path escape 拒否(NFR-1)の対象。

## ADR-2 compose engine の配布所在

**Context**: engine は `scripts/plugin-composition.ts`(未配布)にあり、インストール済みワークスペースの hook / CLI から呼べない(2026-07-26 実測: dist に plugin 系 0 件)。依存は core/tools 2 ファイル+ReadOnlyFs seam のみ。

**Decision**: engine 本体を `packages/framework/core/tools/amadeus-plugin-compose.ts` へ**移設**し、全ハーネス dist / self-install に投影する。旧パスの互換 re-export は置かず、消費側 import を同一変更で更新(org.md Forbidden — 互換シム禁止)。

**Alternatives Rejected**:
- **scripts に残し dist へ別バンドル**: 単一実装が 2 面へ複製され drift ガードの守備対象が増える。却下
- **ホストフック側に軽量 compose を再実装**: requirements FR-3 の重複実装禁止に抵触。却下

**セキュリティ影響**: engine の trust grant / no-clobber / path escape 拒否がそのまま配布面へ乗る(弱い合成の配布を構造的に防ぐ)。core/tools 配置はハーネス中立の共有ロジックであり harness-tools-placement に整合(harness 専用ではない)。

## ADR-3 利用者 CLI の形

**Context**: compose / doctor / drop の利用者到達経路(FR-3a)。既習様式は verb 型専用ツール(`amadeus-mirror.ts` の create/sync/close/status)と utility のフラグ型(`--doctor`)の 2 系。

**Decision**: 専用ツール `amadeus-plugin.ts`(C1)に verb(compose / doctor / drop / status)を置き、`/amadeus` 側は既存 utility 経由で案内する。doctor の plugin 行は既存 `--doctor` へ統合(C5 — 利用者は 1 箇所で状態確認)。

**Alternatives Rejected**:
- **utility へ全 verb 直付け**: utility ハンドラ肥大+「Adding a Utility Handler」チェックリストの対象拡大。mirror の既習様式から乖離。却下
- **ハーネス別 CLI**: 7 面の重複。却下

**セキュリティ影響**: mutation verb(compose/drop)は engine の既存ガードを継承。cid:code-generation:no-help-probe-on-mutating-verbs の実リスクは「未実装フラグが余剰引数として無視され mutating verb がそのまま実行される」ことなので、その緩和として **C1 の引数パーサは未知フラグ・余剰引数を fail-closed で拒否**する(`compose --help` は mutation に到達せず usage+exit 2)。引数なし実行の usage 表示はその補完(component-methods.md C1 表の「未知フラグ」行を正とする)。

## ADR-4 ハーネス別配布方式の 3 クラス枠組み

**Context**: FR-1 マトリクスが確定条件だが、設計は方式クラスを先に枠組み化できる(上流の Claude=marketplace / Codex=tag+hash pin / Kiro=folder-drop の 3 型 — commit 29a31f78 の Plugin Mechanism doc)。上流に前例のない cursor / opencode / kimi は folder-drop+hook または manual クラスに入る見込み(codekb component-inventory.md のフック面実測より)。

**Decision**: 全ハーネスを 3 クラスへ分類する枠組みを採用 — **(i) native-manifest**(ホスト標準のプラグイン導入 UI/コマンドあり)、**(ii) folder-drop-auto**(標準機構なし・セッションフックあり — folder-drop+auto-compose)、**(iii) manual-only**(フック起動も不可 — 文書化された 1 コマンド手動 compose)。機械 literal の正準は `"native-manifest" | "folder-drop-auto" | "manual-only"` の 3 値(本 ADR が canonical 定義 — 下流成果物はこの literal を逐語使用する。U1 FD レビュー是正 2026-07-27 で統一)。どのクラスでも trust grant・no-clobber・atomic は engine 側で同一(上流 Kiro の「信頼ゲートなし」より強い契約を維持)。各ハーネスのクラス割当は C9 マトリクスの実測で確定し、割当と degrade 契約を doctor で観測可能にする。

**Alternatives Rejected**:
- **全面 native 前提**: 存在しない機構の仮定(FR-1 で禁止)。却下
- **全面 manual 統一**: 成功指標 3(自動起動)未達。却下

**セキュリティ影響**: クラス (ii)(iii) はホストの信頼境界がないため、Amadeus 側 trust grant が唯一のゲートになる — grant なしの compose は fail-closed(既存 engine 契約の維持を明文化)。

## ADR-5 ホスト投影の生成様式

**Context**: FR-2。中立正本(plugin.json + stages/ + sensors/ + tools/)から各ホスト形式へ。上流 t188 は claude/codex/kiro/kiro-ide の 4 投影+outDir 安全性 6 ケース(#27-32)。

**Decision**: `plugin-projection.ts` に per-harness projector を追加し、`dist/plugins/<name>/<harness>/` へ生成。ハーネス固有トークン({{HARNESS_DIR}} 等)は既存 harness-transform の置換系を再利用。outDir 安全性は上流 #27-32 と同等の拒否集合(非投影 dir / FOREIGN checkout / file / symlink / broken symlink 拒否、真正な先行投影のみ上書き)を実装。0-plugin 時は投影セクション全体が no-op(byte-identical 維持)。

**Alternatives Rejected**: ホストごとの手書きテンプレート複製(単一正本原則違反)。compose 時にオンザフライ投影(インストール可能「成果物」の要件 FR-2 と不整合、marketplace 配布不能)。いずれも却下。

**セキュリティ影響**: 投影は build 時のみ・リポジトリ内で完結。marketplace metadata に秘密情報なし。
