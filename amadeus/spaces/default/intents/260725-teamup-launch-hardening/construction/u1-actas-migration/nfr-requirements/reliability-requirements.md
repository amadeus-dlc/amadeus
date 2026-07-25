# Reliability Requirements — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 主フローと状態遷移（watcher の readiness）、最悪実行時間の内訳を引いた。
- `business-rules.md` — BR-1〜BR-22 のうち該当するものを各要件の根拠 ID とした。
- `requirements.md` — NFR-1〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 交差スタックと「新規ランタイム依存なし」の確認を、技術選択の前提とした。

測定 ref: HEAD `811961123`。

## R-1: 検証の失敗が起動を妨げない

| 項目 | 内容 |
|---|---|
| 要求 | watcher の arming 検証が失敗しても、**チームの起動自体は完了**し、利用者はアタッチして作業できる |
| 実現 | 検証を `mux_attach` の後ろへ移す（BR-8、ADR-5）。run record の確定（`:1484-1492`）も検証より前 |
| 検証 | 全メンバー未 armed を強制したケースで、アタッチが成功し run record が確定していること |

**これが本ユニットの信頼性設計の核心**である。検証は診断であり、起動の可否を左右しない。

## R-2: 失敗を無言にしない

| 項目 | 内容 |
|---|---|
| 要求 | 検証が失敗したら、未 armed のメンバー名と回復手順を stderr へ出し、非ゼロで終了する |
| 実現 | BR-12〜BR-14。`verify_watchers_armed` の既存の診断出力構造を維持し、プロンプト導出のみ変える |
| 検証 | 一部/全部が未 armed のケースで出力内容と exit code |

`org.md` Forbidden の検証劇場（黙って通す）を避ける。

## R-3: スキップも無言にしない

| 項目 | 内容 |
|---|---|
| 要求 | 検証が適用されない場合、理由を stderr へ**ちょうど1回**出す |
| 実現 | 既存の `WATCHER_SKIP_ANNOUNCED` ラッチを維持（BR-7）。launch 経路が判定を2回呼ぶため |
| 検証 | 判定を2回呼んで stderr 1行 / stdout 0 |

## R-4: 前提条件の維持

| 項目 | 内容 |
|---|---|
| 要求 | `delivery.sh set monitor` の呼び出し（`:876-879`（`if [ -f "$DELIVERY" ]` 〜 `fi`、実行行は `:877`））を維持する |
| 根拠 | actas が watcher を起動する**前提条件**（INV-5）。feasibility 実験1（未設定 → sentinel 出ず）と実験2（設定済み → T+32.2秒 で出現）の対照が実証 |
| 検証 | 呼び出しの存在。失敗時は WARN を出して続行する現行挙動も維持 |

**この呼び出しを消すと U1 全体が機能しなくなる。** 消し忘れではなく意図的な保存であることを明示する。

## R-5: 冪等性

| 項目 | 内容 |
|---|---|
| 要求 | `member_bootstrap_prompt` は同一入力に対し同一出力を返す（副作用なし） |
| 実現 | 純関数（BR-4） |
| 検証 | 連続呼び出しでの一致 |

## R-6: 既存テストの非退行

| 項目 | 内容 |
|---|---|
| 要求 | `bash tests/run-tests.sh --ci` が exit 0 |
| リスク | `CLAUDE_MONITOR_PROMPT` の廃止で13の消費者が影響を受ける（BR-18） |
| 実現 | 2キー棚卸し（変数名 + 展開後リテラル）で全数を是正 |
| 検証 | 両キーで repo 全域（配布11コピーを除く）に残存 0 |

## R-7: 外部依存の変化に対する耐性

| 項目 | 内容 |
|---|---|
| リスク | agmsg は repo 外・バージョン管理外であり、actas フローの挙動が将来変わりうる |
| 緩和 | (a) agmsg を変更しない（BR-20）、(b) 検証が失敗しても起動は完了する（R-1）、(c) 失敗は診断として表明される（R-2） |
| 検証 | 設計上の性質。テストでは固定しない |

**agmsg 側の変化で検証が壊れても、利用者は作業を継続できる**という縮退設計になっている。

## 非対象

| 項目 | 理由 |
|---|---|
| SLO / エラーレート / 可用性パーセンテージ | 常駐サービスの指標であり、単発実行の CLI に該当しない（`cid:observability-setup:c3` の趣旨） |
| リトライ・サーキットブレーカ | agmsg のロック競合は失敗ではなく abort であり、リトライの対象ではない。`WATCHER_RESEND_MAX` による再送は既存機構で変更しない（BR-16） |
| 障害復旧手順・ランブック | 本ユニットは診断出力（R-2）で回復手順を利用者へ直接示す |
