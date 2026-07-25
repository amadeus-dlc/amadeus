# Phase Boundary Check — Inception（260725-teamup-attach-latency / Issue #1449）

検証日時: 2026-07-25T09:45Z / 検証者: conductor（ソロモード） / スコープ: amadeus-bugfix（EXECUTE 7 stages: 0.1/0.2/0.3/2.1/2.3/3.5/3.6） / Depth Minimal / Test Strategy Minimal

## トレーサビリティ検証（inception 成果物 → 上流）

| 成果物 | 実在 | 上流トレース |
|---|---|---|
| codekb 9成果物 + `re-scans/260725-teamup-attach-latency.md`（RE） | ✅ ls 実測 | Issue #1449 + 実 launch 実測（3人構成、200.85秒、armed 0/3、rc=1）。base `6d4df9056` → observed `ec624022f`（祖先性 exit 0、distance 125）の差分リフレッシュ。Developer スキャン → Architect 独立検証の直列2段（`cid:reverse-engineering:c3`） |
| `requirements.md`（RA） | ✅ | 上流入力ヘッダ = consumes 全数（business-overview / architecture / code-structure）を本文で実参照。FR-1〜6・NFR-1〜4 はいずれも Issue #1449・ユーザー裁定・ノルムのいずれかへ遡及可（requirements.md § トレーサビリティ） |
| `requirements-analysis-questions.md`（RA） | ✅ | E-OC1 判定（選挙不要＝ソロモード）+ Q1/Q2 のユーザー直接裁定と採用／不採用理由 |

## 前 intent との関係（重要）

Issue #1449 は先行 intent `260724-watcher-timeout-fix` が完走済みで、選挙 E-WTFRA1 が C案（再送予算 2→1、270秒→180秒）を採用し `9b851c5ae` として main へ着地している。本 intent は**その裁定の前提が失効していること**を実測で確定した上で起票された後継である。

- 失効した前提: E-WTFRA1 Q1 が「正常系（全員即 armed）はオーバーヘッドほぼゼロ（実測 59.1ms）」と記していたが、これは sentinel を事前配置したフィクスチャ由来。`clear_stale_watcher_sentinels`（`team-up.sh:1438-1440` のガード内）が起動前に全 sentinel を削除するため、実 launch に「正常系」は存在しない。
- 真因: sentinel を書くのは actas モードの watcher のみ（`watch.sh:307`、ガード `:300`）。team-up.sh は monitor モードで起動する（`team-up.sh:104` / `delivery.sh:301` が第4引数 `ACTIVE_NAME` を渡さない）ため sentinel は構造的に生成されない。書き手の全数 = 1（Architect が `agmsg_ready_path` 全参照・`ready.` 全出現の独立再列挙で確認、反証なし）。
- 前提失効はユーザーへエスカレーション済み。承認を得て #1449 へ実測コメントを投稿し、根治策（actas 移行）は #1476 として分離起票した。

## ゲート・検証の整合

- **運用形態**: ソロモード（`AMADEUS_OPERATING_MODE` 未設定）。選挙・定足数・クロスレビュー2名・delegate 配送は非適用。判断はユーザー直接裁定、独立検証は §12a reviewer subagent と RE の直列2段で担保。
- **RE gate**: §13 学習2件をユーザー承認のうえ persist（`reverse-engineering:seam-writer-mode-precondition` / `reverse-engineering:seam-handshake-symmetry-inventory`）→ approved。
- **RA reviewer**: `amadeus-product-lead-agent` が 2 iterations。
  - iteration 1 → NOT-READY（引用行番号の誤り4件: Critical 1 / Major 2 / Minor 1）。全件を実ファイル直読で追認し是正。同根の誤りが上流 codekb にも伝播していたため `architecture.md` / `re-scans` / `component-inventory.md` も同時是正（`cid:code-generation:same-root-inventory`）。
  - iteration 2 → NOT-READY（新規3件）。うち **1件は真**（`architecture.md:45` の現在節内に `:308` 残存 → `:307` へ是正）、**2件は誤検出**（`architecture.md:224-233` は `:215` の履歴節「team 起動オーケストレーションの watcher-arming アーキテクチャ（履歴: 260722-teamup-prompt-race）」内で observed `a81c11dde` に固定されており、`git show a81c11dde:scripts/team-up.sh` の実測で `start_safety_wait_supervisors()` は当該断面で確かに `:338`、`:340` は codex チェック、`:212` は `safety_wait_process_matches()` であることを確認して却下）。
  - reviewer 予算（2 iterations）消費後の残余是正は、file:line 引用が機械検証可能クラスであるため `cid:requirements-analysis:delegated-review-analysis-with-owned-verdict`（E-LSSADS13）に従い conductor 検証 + record 固定で受理。閉包は**全 file:line 引用の機械的総当たり照合**（5成果物 × 全引用を実ファイルへ突き合わせ）で確認した。
- **センサー**: requirements.md（required-sections / upstream-coverage）・questions.md（required-sections / upstream-coverage / answer-evidence）の最終発火で SENSOR_FAILED 増分 0。初回は upstream-coverage（上流入力ヘッダ不在）と answer-evidence（`unparseable-timestamp`）が FAILED → 是正済み。RE の3センサーは codekb 出力パスが filter に構造不適合で発火不能（`cid:reverse-engineering:re-sensors-codekb-filter-mismatch`）のため、H2 構成と上流入力参照の直接検証で代替した。
- **RA §13**: 学習1件をユーザー承認のうえ persist（`requirements-analysis:historical-section-cite-check-at-observed`）。

## construction へ渡す確定事項

- **Q1 裁定 A**: `watcher_verification_applies()`（`team-up.sh:1077-1079`）へ「起動プロンプトが actas watcher を arm する場合のみ検証する」条件を追加。monitor モードでは理由を stderr へ出してスキップ。agmsg `spawn.sh:565-568` と同型。
- **Q2 裁定 A**: `create_run` の worktree 並列化（`team-up.sh:1282`、実測 1.05秒/個 × 7 ≒ 7.4秒）は本 intent のスコープ外。別 Issue へ分離。
- 検証ロジック本体（`verify_watchers_armed` 他4関数と定数 `:108` / `:114`）は FR-5 により存置。#1476 で actas へ移行した時点でガードが自動的に再有効化される。

## 未解決事項の持ち越し（construction へ）

- **NFR-1（落ちる実証）**: 修正コミット後に対象ファイル限定の `git checkout <fix-sha> -- <path>` で pre-fix 面を再現し、新規テストが赤くなることを実測する。stash は使わない（`cid:code-generation:falling-proof-no-stash`）。注入面はテストが実際に読む面であること（`cid:code-generation:injection-surface-verify`）。
- **NFR-2（既存テスト非退行）**: `tests/integration/t-team-up-watcher-arming.test.ts`（268行）は agmsg をスタブし sentinel をテスト自身が書く構造（`:42` / `:60` / `:87-91`）。この構造自体の是正は #1476 の範囲だが、本変更で壊さないこと。
- **NFR-3**: 新規テストは integration 層、テスト番号は既存と非重複。
- **FR-6**: 正本 `packages/framework/core/tools/team-up.sh` → `dist/`（6ハーネス）+ self-install の同一変更同期。`bun run dist:check` / `bun run promote:self:check`。
- **作業場所の未決**: code-generation を本線 main で行うか Bolt worktree を切るか（別セッションのエージェントが同じ record を park した実測があるため、隔離を選ぶ理由がある）。RA diary § Open questions に記録済み。

判定: **inception 境界の通過可** — 全成果物実在、RE approve 済み、RA reviewer の真の指摘5件を全件是正して機械的総当たりで閉包、誤検出2件は実測で却下、センサー全 PASS、トレーサビリティ断絶なし。
