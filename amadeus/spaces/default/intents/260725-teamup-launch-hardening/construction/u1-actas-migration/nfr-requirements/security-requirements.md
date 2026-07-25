# Security Requirements — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 主フローと制御フロー（検証を `mux_attach` 後ろへ移した後の実行順序）、最悪実行時間の内訳を引いた。
- `business-rules.md` — BR-1〜BR-22 のうち非機能に関わるもの（BR-7 の出力回数、BR-11 の全寿命、BR-15/16 の定数、BR-19〜21 の外部依存）を各要件の根拠とした。
- `requirements.md` — NFR-1〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 交差スタック（bash / herdr / 外部 agmsg / Bun test）と「新規ランタイム依存なし」の確認を、技術選択の前提とした。

測定 ref: HEAD `811961123`。

## 攻撃面の棚卸し

`cid:build-and-test:c1` / `c3` に従い、戦略名で機械的に検査を追加せず、**実在する攻撃面へトレースして比例的に選定**する。

| 面 | 本ユニットでの該当 | 判定 |
|---|---|---|
| 認証情報・シークレット | 追加・参照なし。agmsg の credential store へ委譲する既存構造に変化なし | N/A |
| 外部入力の解析 | `member_bootstrap_prompt` の入力は member 名（`members_for` が返す固定集合）。外部から与えられない | N/A |
| コマンド注入 | 新規のコマンド構築は `printf '/agmsg actas %s' "$role"` のみ。role は `member_role` の出力（`leader` / `e1`〜`e6` の固定集合） | 下記 S-1 |
| 権限・認可のバイパス | 本ユニットは検証を**機能させる**方向であり、緩和ではない | 下記 S-2 |
| ファイル書込・パス操作 | 追加なし。sentinel の削除範囲（`clear_stale_watcher_sentinels`）は不変 | N/A |
| 依存の追加 | なし（`technology-stack.md`: 新規ランタイム依存なし） | N/A |

## S-1: プロンプト組立の注入耐性

| 項目 | 内容 |
|---|---|
| 要求 | `member_bootstrap_prompt` が組み立てる文字列に、member 名由来の任意コードが混入しない |
| 根拠 | role は `member_role` が返す固定集合（`leader` / `e1`〜`e6`）であり、外部入力ではない |
| 検証 | 全 member で導出し、期待形と完全一致することを確認（BR-1） |

**リスクは低い**が、将来 member 名が外部から指定可能になった場合に備え、`printf` のフォーマット指定子で値を渡す（文字列連結で組み立てない）。

## S-2: 検証を機能させることのセキュリティ評価

本ユニットは**検証を実際に動くようにする**方向の変更である。前 intent（PR #1477）が「常に失敗するゲート」を既定でスキップさせたのに対し、U1 はそのゲートを本来の意図どおり働かせる。

| 観点 | 評価 |
|---|---|
| 保護の追加 | #1384（初期プロンプト脱落で watcher が起動しない）の検出が**初めて機能する** |
| 検証劇場の解消 | 「成功しえない検査」が「実際に検出する検査」になる（`org.md` Forbidden の解消方向） |
| 失敗時の挙動 | 無言にせず、未 armed のメンバー名と回復手順を stderr へ出し、非ゼロで終了する（BR-12〜14、no-silent-success） |
| 起動への影響 | 検証は `mux_attach` の後ろで走るため、失敗しても利用者はアタッチして作業できる（可用性を損なわない） |

## S-3: actas 排他ロックの扱い

| 項目 | 内容 |
|---|---|
| 変化 | actas モードへの移行により、agmsg の排他ロック（`actas-claim.sh`）が**新規に発火する** |
| リスク | 他 live セッションが同一 (team, role) を保持していると `status=held` で abort し、起動が失敗する |
| 要求 | 7メンバー同時起動と resume（`-c`）でロック競合による起動失敗が起きないことを**実測する**（BR-21、NFR-3） |
| 緩和の見込み | `_actas_lock_try_claim`（`lib/actas-lock.sh:106-133`）が所有 sid の生存を確認して stale 再取得を許すため、恒久ブロックはしない見込み。**ただし実測で確認する** |

これは可用性リスクであり、機密性・完全性のリスクではない。

## S-4: 外部依存の境界

| 項目 | 内容 |
|---|---|
| 要求 | agmsg（`~/.agents/skills/agmsg/`）を**変更しない**（BR-20） |
| 根拠 | repo 外・バージョン管理外。こちらから変更すると利用者環境との整合が壊れる |
| 検証 | 変更ファイル一覧に agmsg 配下が含まれないこと |

## 実施する検査

| 検査 | 対象 |
|---|---|
| `bun run lint`（Biome） | テストファイル |
| `bun run typecheck` | テストファイル |
| `bash tests/run-tests.sh --ci` | 全スイート |

リポジトリ全体の依存監査（`bun audit` 等）は本ユニットの対象面（依存追加なし）と無関係のため実施しない（`cid:build-and-test:c1-doctor-seam` — 対象変更のセキュリティ回帰と repository 全体の依存監査を別判定にする）。
