# Requirements — integrity-batch(クロスレビュー済みバグ4件の修正バッチ)

## Intent 分析

本 intent の目的は、2名クロスレビューで実在確認済みのバグ4件を、独立 Bolt として並列修正し main へ届けることである。4件はいずれも「フレームワークの完全性(integrity)」に関わる: 人間承認機構の偽陽性(#708)、共有永続ストアの書き込み規約欠如(#707)、テスト資産の管理外化と期待値 drift(#705)、配布 knowledge の参照整合(#706)。

上流コンテキスト: reverse-engineering の codekb 差分リフレッシュ(`codekb/amadeus/` の architecture.md / code-structure.md / business-overview.md ほか、observed 162553b99)で、4バグの焦点コードが直近差分区間で無変更=前回スキャン点から残存していることを確認済み。欠陥の file:line 台帳は code-quality-assessment.md「既知の欠陥 — 今回 intent」節にある。

## 機能要件(バグ別、受け入れ基準付き)

### FR-1: #708 — human-presence gate の偽陽性排除(P1)

`amadeus-mint-presence.ts` が機械注入 user-role メッセージ(monitor task-notification、Stop-hook フィードバック等)で HUMAN_TURN を mint しないこと。

- FR-1.1: mint-presence は UserPromptSubmit の stdin ペイロードを読み取り、機械注入と判別できる入力に対しては HUMAN_TURN を記録しない。
- FR-1.2: 判別ロジックは**実機キャプチャしたペイロード**に基づくこと(推定実装の禁止)。実装第一歩として UserPromptSubmit ペイロードの実フィールドを記録・検分する(型 `ClaudeCodeHookInput` は `source?`/`prompt?` を既宣言だが、型在≠ランタイム到来)。
- FR-1.3(条件分岐): 実機ペイロードに判別材料が存在しない場合、コード変更は fail-open のまま最小に留め、「機械注入が HUMAN_TURN を mint しうる」を harness 制約として文書化し、gate 運用は delegate provenance(#671)を正道とする旨を明文化する(Issue #708 緩和候補(b))。ゲートの緩和・偽装は検証劇場 Forbidden により禁止。
- FR-1.4: 受け入れ基準(落ちる実証): 機械注入相当のペイロードを stdin に与えて hook を実行し HUMAN_TURN が増えないこと、および人間相当のペイロードで HUMAN_TURN が1件増えることを、テストまたは記録された実測手順で示す。修正前のコードでは前者が失敗(=mint されてしまう)することを先に示す。
- FR-1.5: mint の fail-open 性(mint 失敗が人間のターンをブロックしない)は維持する。

### FR-2: #707 — codekb 並行リフレッシュの衝突解消(P2)

並行 intent の差分リフレッシュが `codekb/<repo>/` で正しさを壊さないこと。

- FR-2.1: `reverse-engineering-timestamp.md` の単一ファイル相互上書きを解消する: per-intent または追記型(intent / base / observed / focus を1レコードとする)の記録構造に変更し、差分リフレッシュの base 点が並行 intent に上書きされないこと。
- FR-2.2: codekb 本文(9ファイル)は「最新スキャンが正」= last-writer-wins をステージ定義(`reverse-engineering.md`)に明文化する(本文は実コードから再導出可能な派生キャッシュであるため)。
- FR-2.3(B軽量要素): リフレッシュ開始前に到達可能な最新 codekb を取り込む手順をステージ定義に追記する(stale base の縮小)。
- FR-2.4: 受け入れ基準: 2つの intent レコードが相異なる base/observed を記録しても互いのレコードを破壊しないことをテストで示す(修正前の単一ファイル構造では上書きが起きることを先に示す)。timestamp を読む側(diff-refresh の base 解決)が自 intent 系列の最新レコードを解決できること。

### FR-3: #705 — sdk-drive calibration のランナー管理化 + doctor 期待値同期(P2)

- FR-3.1: `tests/harness/` の sdk-drive calibration テストを `tests/run-tests.sh`(`run-tests.ts` の levelFiles)の管理下に置く(レベル追加 or 既存レベルへの編入は実装判断)。CI から到達可能であること。
- FR-3.2: calibration 内の doctor 期待値(`DOCTOR_DOCS_LABEL` 等)を現行 doctor 出力(`amadeus-utility.ts:628` の「workspace shell ready …」)に同期する。
- FR-3.3: 受け入れ基準: 修正前の期待値でテストが赤くなること(drift の実証)、同期後に緑になること、ランナー経由(`bash tests/run-tests.sh` の該当プロファイル)で当該テストが実行されることを exit code 付きで示す。

### FR-4: #706 — delivery workflow guide の参照修正(P3)

- FR-4.1: `packages/framework/core/knowledge/amadeus-delivery-agent/workflow-planning-guide.md:3` の `product-guide.md` 参照を `{{HARNESS_DIR}}/knowledge/amadeus-product-agent/product-guide.md` の明示パスに修正する(Option 1)。
- FR-4.2: 修正は core を編集元とし、`bun scripts/package.ts` で dist 4ハーネス、`bun run promote:self` でセルフインストールへ同一コミットで伝播させる。
- FR-4.3: 受け入れ基準: `grep` により core / dist(claude・codex・kiro・kiro-ide)/ self-install の全コピーで新パスが一致すること。`bun run dist:check` と `bun run promote:self:check` が exit 0。

## 非機能要件

- NFR-1: 全 Bolt で PR/CI 基準(`bun run typecheck`、`bun run lint`、`bun run dist:check`、`bun run promote:self:check`、`bash tests/run-tests.sh --ci`)が exit 0。
- NFR-2: 新設・変更するテスト/チェックは「落ちる実証」(失敗ケース注入で実際に赤くなる)を完成条件とする(team.md Mandated)。
- NFR-3: 要求されていない後方互換レイヤー・フォールバック分岐・移行シムを追加しない(team.md Forbidden)。#708 の fail-open 維持は既存契約の維持であり互換シムではない。
- NFR-4: リグレッションテストは各バグの故障モードを直接固定する(スコープ別デフォルト: bugfix はリグレッションテスト追加+既存スイートのグリーン維持)。

## 制約

- C-1(編集順合意): `amadeus-mint-presence.ts` は本 intent 専有。`amadeus-state.ts`(handleReject 近傍)/ `amadeus-lib.ts`(presence 関数群)への変更は最小に留め、presence 判定系のシグネチャ/意味を変えた場合は PR 発行時に claude-engineer-3(gate-mechanics-batch #685)へ差分を直送する(2026-07-09 agmsg 合意)。
- C-2: Bolt ごとに PR/スカッシュマージ。工程記録はチェックポイントコミットで流し、実装 PR に混ぜない。PR 作成時は codex メンバーへ直接レビュー依頼。マージは人間承認後に leader が執行。
- C-3: ドキュメント修正(#706 の guide、#707 のステージ定義)は claude メンバーが行う(2026-07-09 役割分担ノルム)。
- C-4: bugfix スコープにつき walking-skeleton セレモニーなし。Bolt は4件独立・並列実行可(相互依存なし)。

## 前提

- A-1: UserPromptSubmit ペイロードの実フィールドは実機キャプチャで確定する(現時点では `ClaudeCodeHookInput` の型宣言のみが手掛かり)。FR-1.3 の条件分岐はこの結果に依存する。
- A-2: codekb 本文の last-writer-wins が許容されるのは、本文が実コードから再導出可能な派生キャッシュであるため(#707 レビュー合意)。手書きの独自コンテンツを codekb 本文に置く運用は想定しない。
- A-3: #705 の calibration テストは现行 4 Level 構成(smoke/unit/integration/e2e)の枠内または追加プロファイルで管理可能である。

## スコープ外

- #688(PBT 本格導入)— enhancement 凍結継続(bugs-only-scope、ユーザー裁定 2026-07-09)。
- #685(delegate-rejection)— gate-mechanics-batch(claude-3)の担当。
- delivery-planning stage への support_agents 追加(#706 の D 案)— 参照修正で足りるため採らない。
- mint-presence の廃止・delegate provenance への一本化(#708 の B 案)— ローカル単独運用の正当な presence 経路を壊すため採らない。

## 未解決事項(後続ステージへ)

- OQ-1: UserPromptSubmit 実機ペイロードのフィールド構成(code-generation 冒頭で実測。FR-1.3 の分岐判定材料)。
- OQ-2: #705 calibration の配置先(levelFiles 追加 or 既存レベル編入)— functional-design/code-generation の実装判断。
- OQ-3: #707 timestamp 新構造の正確なスキーマ(per-intent ファイル vs 単一ファイル内追記レコード)— functional-design で確定。
