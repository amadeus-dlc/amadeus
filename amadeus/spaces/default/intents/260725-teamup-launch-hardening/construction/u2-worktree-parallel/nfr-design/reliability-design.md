# Reliability Design — U2: worktree 並列化（#1478）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/performance-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/security-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/scalability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/reliability-requirements.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/nfr-requirements/tech-stack-decisions.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u2-worktree-parallel/functional-design/business-logic-model.md`

- `reliability-requirements.md` — R-1（部分失敗からの回復）、R-2（ロールバックの完全性）、R-3（孤児ディレクトリ）、R-4（走査範囲の安全性）、R-5/R-6（失敗の可視性と伝播）、R-8（メタデータの完全性）を、下記の実装方針で満たす対象とした。
- `business-logic-model.md` — 状態遷移（[部分作成] からの回復）と、台帳をやめる理由を引き、ロールバック設計の根拠とした。
- `security-requirements.md` — S-1（破壊的操作の範囲限定）を引き、走査範囲の限定を最優先の設計制約とした。
- `performance-requirements.md` — P-3（上限4）を引き、並列度が失敗時の巻き戻し量に影響しないことを確認した。
- `scalability-requirements.md` — SC-1（メンバー数に対する所要時間）を引き、バッチ境界で失敗した場合の挙動を検討した。
- `tech-stack-decisions.md` — 「成功集合を一時ファイルで親へ回収する案を却下」を引き、実在走査を採る根拠とした。

測定 ref: HEAD `138a60372`。

## 設計方針

**削除対象の決定根拠をメモリからファイルシステムへ移す。** ただし範囲限定を最優先とする（誤って消す方が、消し残すより有害）。

## D-R1: ロールバック対象の再導出

```
rollback_prepared_run():
  RUN_ROOT 配下を走査し、members_for "$TEAM_SIZE" の集合に含まれる名前の
  ディレクトリのみを対象とする
  各対象について:
    git worktree remove --force
    git branch -D
  最後に rm -rf -- "$RUN_ROOT" "$RUN_RECORD"   ← 現行 :1250、位置不変
```

**台帳（`CREATED_MEMBERS`）を読まない。** サブシェルで作られた worktree も実体として観測できる。

## D-R2: 走査範囲の限定（最優先）

| 防御 | 内容 |
|---|---|
| 起点の限定 | `RUN_ROOT` は `create_run` が `$BASE/runs/$RUN_ID` として組み立て（`:1280`）、`:1282` で既存衝突を拒否する（`:1283` は `RUN_RECORD` 側） run 専用ディレクトリ |
| 名前の照合 | 走査で得たディレクトリ名を `members_for "$TEAM_SIZE"` の集合と突き合わせ、**一致するものだけ**を対象にする |
| 深さの限定 | `RUN_ROOT` の**直下**のみ。再帰しない |

**この3重の限定により、`RUN_ROOT` 外や無関係な名前のディレクトリには一切触れない。**

## D-R3: 孤児ディレクトリの扱い

`git worktree add` が途中失敗して git 登録されていない残骸は `git worktree remove` が効かない。

**現行の末尾 `rm -rf -- "$RUN_ROOT" "$RUN_RECORD"`（`:1250`）がこれをカバーする。追加実装は不要。** この行を残すことが要件（R-3）。

## D-R4: 失敗の検知と伝播

サブシェルの終了コードは親へ自動では伝わらない。

| 項目 | 設計 |
|---|---|
| 各サブシェル | `git worktree add` が失敗したらメンバー名付きで stderr へ出し、非ゼロで終了する |
| 親 | 失敗を検知する手段が要る（R-6） |
| 実装の選択肢 | (a) `wait` の終了コードを見る、(b) 失敗マーカーファイルを `RUN_RECORD` 配下へ置く、(c) 全作成後に worktree の実在を照合する |

**(c) を採る。ただし「実体」は *ディレクトリの有無* ではなく *git への正規登録* とする。**

`create_run` の最後に `members_for` の全メンバーについて、`RUN_ROOT/<member>` が **`git worktree list --porcelain` に登録されているか**を照合し、1つでも欠けていれば非ゼロで返す。

### なぜディレクトリの有無では不十分か

`git worktree add` は失敗の種類によって、**対象ディレクトリを作成した後に checkout 段階で失敗しうる**（ディスクフル、パーミッション、hook 失敗等）。この場合ディレクトリは存在するが git に正規登録されていない。**ディレクトリの有無だけを見る照合はこれを「成功」と誤判定する。**

実測（本リポジトリで検証）:

| ケース | ディレクトリ存在 | `git worktree list --porcelain` に登録 |
|---|---|---|
| 正常に作成された worktree | YES | **1件（検出）** |
| ディレクトリのみ（git 未登録） | YES ← **偽陽性** | **0件（正しく除外）** |

`git -C <path> rev-parse --is-inside-work-tree` も判別できるが、対象パスがリポジトリ配下にある場合は親を辿って `true` を返しうるため、**`git worktree list --porcelain` との照合を採る**。

### 選択肢の比較

| 案 | 却下理由 |
|---|---|
| (a) `wait` の終了コードを見る | bash のバッチ `wait` で個別ジョブの結果を取るのが煩雑 |
| (b) 失敗マーカーファイルを置く | 新たな状態ファイルを増やす（`org.md` Forbidden の要求外機構） |

(c) は D-R1（ロールバックの実在走査）と同じ「実体を観測する」原理で一貫し、追加の機構を要さない。**両者とも「実体」= git 登録として定義を揃える。**

### D-R1 への波及

ロールバック側の走査も、対象を「`RUN_ROOT` 直下の member 名ディレクトリ」で拾ったうえで、`git worktree remove` が効かない孤児（git 未登録）は D-R3 の末尾 `rm -rf`（`:1250`）でカバーする。**走査は広め（ディレクトリ）、除去手段は2段（`worktree remove` → `rm -rf`）** という非対称は意図的である — 巻き戻しは取りこぼさない方が安全だが、成否判定は厳しい方が安全だからである。

## D-R5: メタデータの完全性

各サブシェルが `RUN_RECORD/members/<member>/{path,branch}` を書く（R-8）。

| 根拠 | 内容 |
|---|---|
| 非交差 | 各メンバーのパスは `RUN_RECORD/members/<member>/` で完全に分離（INV-P3） |
| 越境性 | ファイル書込はサブシェル境界を越えて残る |
| 検証 | 並列実行後に全メンバー分のメタデータが揃っていること |

**共通ファイルへの追記をしない。** これを破ると並列書込が競合する。

## D-R6: 失敗の可視性

並列実行では複数サブシェルの stderr が交錯する（R-5）。

```
ERROR: worktree add failed for <member>: <path>
```

**1行に必要な情報（メンバー名とパス）をすべて含める。** 複数行にまたがる出力にすると、交錯したときにどの行がどのメンバーのものか判別できなくなる。

## D-R7: git のロック競合

実測で全並列度において失敗ゼロ（成功 7/7、stderr 0 bytes）。**リトライ機構を追加しない**（R-7）。

存在しない問題への対策を足さない（`org.md` Forbidden の要求外機構）。

## D-R8: 消費者の全数是正

`CREATED_MEMBERS` の廃止（現時点で3消費者）。

```sh
grep -rn "CREATED_MEMBERS" packages/framework/core/tools/team-up.sh tests/ scripts/ docs/
```

**実装時に再実行して確定する**（U1 の変更で行番号がシフトするため）。出力からの転記で確認し、既存表を複製しない（`cid:functional-design:inventory-from-grep-each-time`）。

## 対象外

| 項目 | 理由 |
|---|---|
| 部分成功の許容 | 現行の全か無かの契約を維持する。中途半端な run は利用者を混乱させる |
| リトライ・サーキットブレーカ | D-R7 のとおり不要 |
| SLO / 可用性パーセンテージ | 単発実行の CLI に該当しない |
