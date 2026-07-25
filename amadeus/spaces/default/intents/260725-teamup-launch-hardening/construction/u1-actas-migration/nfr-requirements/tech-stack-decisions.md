# Tech Stack Decisions — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 主フローと状態遷移（watcher の readiness）、最悪実行時間の内訳を引いた。
- `business-rules.md` — BR-1〜BR-22 のうち該当するものを各要件の根拠 ID とした。
- `requirements.md` — NFR-1〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 交差スタックと「新規ランタイム依存なし」の確認を、技術選択の前提とした。

測定 ref: HEAD `811961123`。

## 結論

**新規の技術選択はない。** `technology-stack.md` が確認したとおり、本 intent の交差要素（bash / git / herdr / 外部 agmsg / Bun test）はいずれも既存スタックであり、新規ランタイム依存を導入しない。

## 使用する技術と選択理由

| 技術 | 用途 | 選択理由 |
|---|---|---|
| **bash** | `team-up.sh` の制御フロー、`member_bootstrap_prompt` の実装 | 対象ファイルが `#!/usr/bin/env bash` の既存 bash スクリプト（配列・`local`・`[[ ]]`・`$RANDOM` を使用）。言語を変える理由がない |
| **外部 agmsg スキル** | watcher の起動と ready sentinel の生成 | repo 外・read-only。契約は agmsg が握っており、こちらは呼び出し方（初期プロンプトの形）でのみ関わる（BR-20） |
| **herdr** | ペイン生成、プロンプト再送 | 既存。本ユニットで送る文字列だけが変わる |
| **Bun test（integration 層）** | テスト | 実 FS・プロセスを使うため integration 層（`cid:code-generation:fs-tests-integration-first`）。既存シーム `TEAM_UP_LIB_ONLY=1` source を使う |

## 検討して採らなかった選択

| 案 | 却下理由 |
|---|---|
| プロンプト導出を連想配列で保持する | 技術的には可能（bash スクリプトのため）が、**状態を持つ必要がない**。member 集合の変化（`-2`/`-4`/`-6`）への追従コードが要り、`MSG_BACKEND` が起動途中で解決されるため導出時に評価する関数の方が正しい（ADR-1） |
| 検証を別プロセス（バックグラウンド）へ逃がす | 通知経路の新設が要る（`org.md` Forbidden の要求外機構）。exit code が無意味になり CI 等からの結果判定ができなくなる（ADR-5） |
| agmsg 側を変更して monitor モードでも sentinel を書かせる | repo 外・バージョン管理外の外部依存であり、変更すると利用者環境との整合が壊れる（BR-20） |
| 別の readiness 指標（`run/watch.<id>.pid` 等）へ切り替える | intent-capture Q2 裁定 B として保持しているが、feasibility 実験2で actas 移行が成立したため**発動しない**。R-2 / R-3 が顕在化した場合の分岐先として残す |

## 定数の技術的根拠

| 定数 | 値 | 根拠 |
|---|---|---|
| `WATCHER_READY_TIMEOUT` | 実測 32.2秒 を安全側に上回る値 | feasibility 実験2の実測に接地（BR-15、`cid:requirements-analysis:constants-from-code`） |
| `WATCHER_RESEND_MAX` | 1（変更しない） | #1384 の prompt 脱落回復に最低1回の再送が要る。前 intent E-WTFRA1 の裁定（BR-16） |

## 配布への影響

正本 `packages/framework/core/tools/team-up.sh` の変更は、`bun scripts/package.ts` と `bun run promote:self` で dist 6面 + self-install 4面 = 計11コピーへ伝播する（BR-22）。**手書きのコピーは作らない**（`project.md` Forbidden: dist を実装の近道として手編集しない）。
