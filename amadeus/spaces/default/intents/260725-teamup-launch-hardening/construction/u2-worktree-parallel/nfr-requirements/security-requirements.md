# Security Requirements — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`、`amadeus/spaces/default/codekb/amadeus/technology-stack.md`

- `business-logic-model.md` — 並列化後のフローと並列度別の実測表を引いた。
- `business-rules.md` — BR-P1〜BR-P20 のうち該当するものを各要件の根拠 ID とした。
- `requirements.md` — FR-6〜FR-8 / NFR-1 / NFR-4〜NFR-8 を本ステージで具体化する対象とした。
- `technology-stack.md` — 「bash のジョブ制御で賄える範囲、外部の並列化ユーティリティ導入は要さない」という確認を前提とした。

測定 ref: HEAD `811961123`。

## 攻撃面の棚卸し

`cid:build-and-test:c1` / `c3` に従い、戦略名で機械的に検査を追加せず、**実在する攻撃面へトレースして比例的に選定**する。

| 面 | 本ユニットでの該当 | 判定 |
|---|---|---|
| 認証情報・シークレット | 追加・参照なし | N/A |
| 外部入力の解析 | 並列化の入力は member 名（`members_for` が返す固定集合）と `RUN_ID`（`create_run` が生成、`valid_run_id` で検証済み） | N/A |
| コマンド注入 | 新規のコマンド構築なし。`git worktree add` の引数は現行と同一 | N/A |
| 権限・認可のバイパス | 該当なし | N/A |
| **ファイル削除・パス操作** | **ロールバックが破壊的操作である** | 下記 S-1（最重要） |
| 競合状態 | 並列書込が発生する | 下記 S-2 |
| 依存の追加 | なし（bash のジョブ制御のみ） | N/A |

## S-1: 破壊的操作の範囲限定（最重要）

| 項目 | 内容 |
|---|---|
| リスク | ロールバックは `git worktree remove --force` と `rm -rf` を実行する。**対象を誤ると無関係な worktree やディレクトリを消す** |
| 要求 | 走査は `RUN_ROOT` **直下の member 名ディレクトリ**に限定し、`members_for "$TEAM_SIZE"` の集合と突き合わせる（BR-P9、INV-P2） |
| 追加の防御 | `RUN_ROOT` は `create_run` が `$BASE/runs/$RUN_ID` として組み立て（`:1280`）、`:1282` で既存衝突を拒否する（`:1283` は `RUN_RECORD` 側） run 専用ディレクトリ。他の run と混ざらない（INV-P1） |
| 検証 | 走査対象の検査。`RUN_ROOT` 外に影響しないこと |

**台帳（`CREATED_MEMBERS`）から実在走査へ変えることで、削除対象の決定根拠がメモリからファイルシステムへ移る。** この変更自体が「消してよいものだけを消す」保証を弱めないよう、走査範囲の限定が要件になる。

## S-2: 並列書込の競合

| 項目 | 内容 |
|---|---|
| リスク | 複数サブシェルが同時に `RUN_RECORD/members/` 配下へ書く |
| 評価 | 各メンバーのパスは `RUN_RECORD/members/<member>/` で完全に分離されており**互いに非交差**（INV-P3）。競合しない |
| 要求 | この非交差性を壊す変更を入れない（例: 共通ファイルへの追記） |
| 検証 | 並列実行後に全メンバー分のメタデータが揃っていること（BR-P4、R-8） |

## S-3: git のロック競合

| 項目 | 内容 |
|---|---|
| 実測 | 全並列度で成功 7/7、stderr 0 bytes。**失敗にならない** |
| 評価 | git が内部でロックを直列化する。データ破損のリスクは観測されなかった |
| 要求 | リトライ機構を追加しない（不要な複雑さを持ち込まない） |

## 実施する検査

| 検査 | 対象 |
|---|---|
| `bun run lint` / `typecheck` | テストファイル |
| `bash tests/run-tests.sh --ci` | 全スイート |
| **失敗注入によるロールバック検証** | S-1 の範囲限定が実際に働くこと（BR-P10） |

リポジトリ全体の依存監査は本ユニットの対象面（依存追加なし）と無関係のため実施しない（`cid:build-and-test:c1-doctor-seam`）。
