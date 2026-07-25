# Security Design — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`

- `security-requirements.md` — S-1（プロンプト組立の注入耐性）、S-2（検証を機能させることの評価）、S-3（actas ロック）、S-4（外部依存の境界）を、下記の実装方針で満たす対象とした。
- `business-logic-model.md` — プロンプト導出の判断（`member_bootstrap_prompt`）を引き、注入面の範囲を確定した。
- `reliability-requirements.md` — R-2（失敗を無言にしない）を引き、診断出力が情報漏洩にならないことを確認した。
- `tech-stack-decisions.md` — 「新規ランタイム依存なし」を引き、依存追加に伴う攻撃面の拡大がないことを確認した。
- `performance-requirements.md` — P-3 のタイムアウト値が DoS 的な待機を生まないことを確認した。
- `scalability-requirements.md` — SC-4（7人構成でのロック競合）を引き、可用性リスクの検証項目とした。

測定 ref: HEAD `138a60372`。

## 設計方針

本ユニットは**検証を機能させる**方向の変更であり、保護を外す変更ではない。新規の攻撃面は導入しない。

## D-S1: プロンプト組立の安全性

```sh
member_bootstrap_prompt() {
  local m="$1" role
  [ "$MSG_BACKEND" = "agmsg" ] || { printf ''; return 0; }
  role="$(member_role "$m")"
  printf '/agmsg actas %s' "$role"
}
```

| 防御 | 内容 |
|---|---|
| 値域の限定 | `role` は `member_role` の出力（`leader` / `e1`〜`e6`）。外部入力ではない |
| フォーマット指定子で渡す | `printf '/agmsg actas %s' "$role"` — 文字列連結や `eval` を使わない |
| 引用符 | 呼び出し側では `"$(member_bootstrap_prompt "$m")"` と展開を引用符で囲む |

**将来 member 名が外部から指定可能になった場合**でも、`printf` の `%s` で渡す構造なら値がフォーマット文字列として解釈されない。

## D-S2: 検証を機能させることの評価

| 観点 | 評価 |
|---|---|
| 保護の方向 | #1384 の検出が**初めて機能する**。保護の追加であって除去ではない |
| 検証劇場の解消 | 「成功しえない検査」→「実際に検出する検査」（`org.md` Forbidden の解消方向） |
| 可用性への影響 | 検証は `mux_attach` の後ろ。失敗しても利用者は作業できる（`reliability-design.md` D-R1） |
| 情報漏洩 | 診断出力に含まれるのはメンバー名とプロンプト文字列のみ。認証情報・パス・セッション ID を出さない |

## D-S3: 診断出力の内容

`reliability-design.md` D-R2 の3行が出す情報を確認する。

| 出力 | 含む情報 | 機密性 |
|---|---|---|
| 未 armed のメンバー名 | `leader` / `engineer-N` | なし（固定集合） |
| 再送回数 | `WATCHER_RESEND_MAX` の値 | なし（定数） |
| 回復用プロンプト | `/agmsg actas <role>` | なし |

**sentinel のパスやセッション ID を出さない。** 現行も出しておらず、変更しない。

## D-S4: actas 排他ロックの可用性リスク

| 項目 | 内容 |
|---|---|
| 分類 | **可用性**リスク。機密性・完全性のリスクではない |
| 内容 | 他 live セッションが同一 (team, role) を保持していると abort する |
| 本ユニットでの対応 | agmsg の挙動をそのまま受け入れ、こちらでロックを操作しない（`reliability-design.md` D-R6） |
| 検証 | 7人構成と resume での実測 |

**ロックを迂回する実装をしない。** 排他は agmsg が意図して設けた保護であり、こちらで無効化すると複数セッションが同一ロールで受信する状態を作る。

## D-S5: 外部依存の境界

| 項目 | 内容 |
|---|---|
| 要求 | agmsg（`~/.agents/skills/agmsg/`）を変更しない（S-4） |
| 実装 | 変更ファイルは `packages/framework/core/tools/team-up.sh` と `tests/integration/` 配下のみ |
| 検証 | 変更ファイル一覧に agmsg 配下が含まれないこと |

## 実施する検査

| 検査 | 対象 |
|---|---|
| `bun run lint` / `typecheck` | テストファイル |
| `bash tests/run-tests.sh --ci` | 全スイート |

依存追加がないため、リポジトリ全体の依存監査は本ユニットの対象面と無関係（`cid:build-and-test:c1-doctor-seam`）。
