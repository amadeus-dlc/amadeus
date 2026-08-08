# Code Summary — u5-measurement-report

上流入力(consumes 全数): code-generation-plan.md(本 unit の受け入れ基準と実施手順)、functional-design/business-rules.md(BR-U5-1〜6 の充足判定)、functional-design/domain-entities.md(レポート節構成)。

本 unit の成果物は**計測レポート本体**であり、それは本ファイルの「計測レポート」節そのものである(コード変更ゼロ)。

---

# 計測レポート — Intent autonomy 到達性(#2378 適用後)

## 1. 計測 ref(BR-U5-3 / cid:reverse-engineering:measurement-ref-in-artifacts)

| 項目 | 値 |
|---|---|
| clone 種別 | local worktree(committed corpus ではない — 進行中 intent の未マージ record を含む) |
| clone id | `f3d36374cb9b` |
| observed SHA | `7b293f17320398fb516d2cc04596d1b2f1ef481b` |
| 測定時刻 | `2026-08-08T09:21:04Z` |
| 正規化述語 | `(.attributes.Event // .event)` |
| コーパス | intent records **145** / shards 233(スクリプトの生出力は 146 — 内訳は下記) |

数値はすべて後掲スクリプトの実出力からの転記である(BR-U5-3、cid:requirements-analysis:numbers-from-command-output-only)。派生値は本レポートに存在しない(すべて直接計数)。

**records 146 → 145 の訂正**(§12a reviewer の FOLLOW-UP 指摘を受けた再計数): §8 のスクリプトは `find "$INTENTS" -maxdepth 1 -mindepth 1 -type d | wc -l` で 146 を返すが、この 146 には **intent ではないディレクトリ `amadeus/spaces/default/intents/audit/` が1件含まれる**。実測 — `ls amadeus/spaces/default/intents/audit/` に per-clone シャード6ファイルが実在し、`find … -maxdepth 2 -mindepth 2 -type d -name audit | wc -l` は 143(= audit サブディレクトリを持つ intent record 数)を返す。したがって intent record の実数は **145**、うち 143 が audit を持つ。

この訂正が影響するのは本行の corpus 記述だけである — § 4 の集計値(290 / 0 / 940 / 6829)は `find … -path '*/audit/*.jsonl'` を母集団とするため孤立ディレクトリのシャードを含んでおり件数は不変、§ 8.1 の per-record ループは `[ -d "$dir/audit" ]` が偽になるため孤立ディレクトリを自然に除外している(reviewer が独立に同じ判定へ到達)。

**この孤立ディレクトリ自体が別の欠陥の痕跡である可能性**: `intents/` 直下は intent record が並ぶ層であり、そこへ audit シャードが落ちているのは active-intent カーソル未解決時の書込先誤りを示唆する。本 intent のスコープ外のため是正はしないが、申し送りとして記録する(#2378 の対象は autonomy の到達性であり、audit 書込先の解決は別系統)。

## 2. 依存の着地確認(BR-U5-5)

計測に先立ち、u1・u2・u3 の着地面を `origin/main` の実 grep で確認した。

| 依存 | 検査 | 結果 |
|---|---|---|
| u1(拒否可視化) | `git show origin/main:packages/framework/core/tools/amadeus-audit.ts \| grep -c INTENT_AUTONOMY_HUMAN_REQUIRED` | **2** |
| u3(経路属性) | `git show origin/main:packages/framework/core/tools/amadeus-log.ts \| grep -c "Resolution Route"` | **3** |
| u2(launch-chain provenance) | `git show origin/main:packages/framework/core/tools/amadeus-intent-autonomy-production.ts \| grep -c launchTurnFingerprint` | **3** |
| u2(carry 搬送) | `git show origin/main:packages/framework/core/tools/amadeus-utility.ts \| grep -c autonomy-turn` | **1** |

4面とも着地済み。したがって以下の計測はすべて「機構が存在する状態」での観測である。

## 3. ベースライン(BR-U5-2 / FR-4b)

- **C1**: 508 / 178 / 686、13 intents(mode.set 前後の human.turn)
- **C3**: 3 intent の tx / question.answered / human.turn 対照

**C2(231件 / 63 intents)は使用しない** — クロスレビュー2名が再現不能と判定済み(FR-4b)。本レポートは C2 を一切引用していない。

## 4. 適用後計測 — コーパス全体

| 述語 | 件数 |
|---|---|
| `INTENT_AUTONOMY_TRANSACTION_COMMITTED`(正準・FR-4a) | **290** |
| `INTENT_AUTONOMY_HUMAN_REQUIRED`(u1 新設) | **0** |
| `QUESTION_ANSWERED` | **940** |
| `HUMAN_TURN` | **6829** |

`AUTONOMY_MODE_SET`(legacy)は述語に含めていない(FR-4a)。

### 4.1 `QUESTION_ANSWERED` の Resolution Route 内訳(u3 属性)

| Route | 件数 |
|---|---|
| `unknown(pre-u3)`(属性欠落 = 属性導入前の行) | **940** |
| `human` | 0 |
| `ladder` | 0 |

### 4.2 `INTENT_AUTONOMY_HUMAN_REQUIRED` の Reason 内訳(u1 イベント)

該当行ゼロのため内訳なし。

## 5. C3 形式の per-record 標本

| record | tx | q.ans | human.turn | refusal |
|---|---|---|---|---|
| 260805-semi-redefine-autonomy-f | 64 | 0 | 25 | 0 |
| 260805-pr-convergence-plugin | 32 | 0 | 9 | 0 |
| 260805-subagent-type-guard | 20 | 5 | 30 | 0 |
| **260807-autonomy-reachability(本 intent)** | **21** | **0** | **24** | **0** |

## 6. FR-4c の受け入れ判定 — **PENDING**(PASS と代用しない)

FR-4c は「**適用後の新規 intent**で『mode 設定前 human.turn = 0』を確認する」を求める。本 intent(260807-autonomy-reachability)は**修正の着地より前に birth している**ため、この受け入れの標本にならない。実測した順序:

| 事象 | 時刻 |
|---|---|
| 最古の監査行(birth) | `2026-08-07T11:26:35Z` |
| 最初の `HUMAN_TURN` | `2026-08-07T11:29:58Z` |
| 最初の autonomy transaction | `2026-08-07T11:30:01Z` |

birth(11:26:35Z)から最初の `HUMAN_TURN`(11:29:58Z)まで **3分23秒**あり、その間に mode は設定されていない。これは修正前の挙動そのもの — 宣言が birth 時に効かず、次のユーザープロンプトを待って初めて presence が生まれた形であり、**まさに u2 が閉じた欠陥の観測記録**である。逆に言えば、本 intent は「mode 設定前 human.turn = 0」を満たさない(24件ある)。

**閉包条件**(この PENDING を PASS へ変えるために必要なこと):

1. u2 着地後(`2026-08-08T09:18:57Z` = PR #2524 のマージ以降)に、`/amadeus --autonomy semi "<説明>"` で**新規 intent を birth** する
2. その record の audit shard に対し §7 のスクリプトを実行し、`INTENT_AUTONOMY_TRANSACTION_COMMITTED` の最初の行が、その record 内の最初の `HUMAN_TURN` より**前**(あるいは record 内 `HUMAN_TURN` が 0)であることを確認する
3. 併せて `--autonomy-turn` トークンが birth print directive に載っていることを directive 実体で確認する(u2 の carry 連鎖)

この閉包は**本 intent のスコープでは実施できない**(新規 intent の birth は別の workflow 行為であり、本 intent の record 内で行えばコーパスを汚染する)。したがって申し送りとする。

## 7. `INTENT_AUTONOMY_HUMAN_REQUIRED` = 0 と Route 全件 unknown の解釈 — **PENDING**

いずれも「機構は着地済みだが、着地後の実行がまだ監査面に現れていない」状態である。**欠陥ではない**が、**PASS でもない**(deployment-execution:c3 の分類規律: N/A / NOT EXECUTED / PENDING / PASS を相互代用しない)。

- `INTENT_AUTONOMY_HUMAN_REQUIRED` = 0: 本 intent の残ステージで `next` が **stage-gate の認可経路**を通ると発火する。現在の `next` は `invoke-swarm` を返しており認可 occurrence を生んでいない
- Route 全件 `unknown(pre-u3)`: 940件はすべて u3 着地前に記録された行であり、後方互換契約(BR-U3-4)どおり「経路不明」として読めている — **これは仕様どおりの正常な読み**である。着地後の新規回答から `human` / `ladder` が現れる

**閉包条件**: 着地後に発生した stage-gate 認可 occurrence と質問回答を1件以上含む record で §7 のスクリプトを再実行し、それぞれ非ゼロを確認する。

## 8. 計測スクリプト(BR-U5-4 / BR-U5-6 — 逐語掲載)

repo 外 scratch に置いて実行した。読取のみで audit/record を変更しない。第三者は同じスクリプトを committed corpus に対して再実行できる。

### 8.1 コーパス全体(`u5-measure.sh`)

```bash
#!/bin/bash
# u5-measurement-report — post-application measurement for intent 260807-autonomy-reachability (#2378).
#
# BR-U5-1: only INTENT_AUTONOMY_TRANSACTION_COMMITTED / INTENT_AUTONOMY_HUMAN_REQUIRED /
#          QUESTION_ANSWERED (with its Resolution Route attribute) are counted.
#          The legacy AUTONOMY_MODE_SET is never used for a new measurement.
# BR-U5-4: every read normalizes the schema with `(.attributes.Event // .event)`,
#          because v1 rows carry `.event` at the top level while v2 rows carry it
#          under `.attributes.Event`.
# BR-U5-6: this script lives outside the repository and only READS the shards.
#
# Usage: u5-measure.sh <repo-root>
set -euo pipefail

ROOT="${1:?usage: u5-measure.sh <repo-root>}"
INTENTS="$ROOT/amadeus/spaces/default/intents"

norm='(.attributes.Event // .event)'

echo "=== measurement ref ==="
echo "clone: $(cat "$ROOT/amadeus/.amadeus-clone-id" 2>/dev/null || echo '(none)')"
echo "sha: $(git -C "$ROOT" rev-parse HEAD)"
echo "measured_at: $(date -u +%Y-%m-%dT%H:%M:%SZ)"
echo "predicate: $norm"
echo

echo "=== corpus ==="
shards=$(find "$INTENTS" -path '*/audit/*.jsonl' | wc -l | tr -d ' ')
records=$(find "$INTENTS" -maxdepth 1 -mindepth 1 -type d | wc -l | tr -d ' ')
echo "records: $records"
echo "shards: $shards"
echo

echo "=== totals (whole corpus) ==="
for event in INTENT_AUTONOMY_TRANSACTION_COMMITTED INTENT_AUTONOMY_HUMAN_REQUIRED QUESTION_ANSWERED HUMAN_TURN; do
  n=$(find "$INTENTS" -path '*/audit/*.jsonl' -exec cat {} + \
      | jq -r --arg e "$event" "select($norm == \$e) | 1" 2>/dev/null | wc -l | tr -d ' ')
  echo "$event: $n"
done
echo

echo "=== QUESTION_ANSWERED by Resolution Route (u3 attribute) ==="
find "$INTENTS" -path '*/audit/*.jsonl' -exec cat {} + \
  | jq -r "select($norm == \"QUESTION_ANSWERED\") | (.attributes[\"Resolution Route\"] // .fields[\"Resolution Route\"] // \"unknown(pre-u3)\")" 2>/dev/null \
  | sort | uniq -c | sort -rn
echo

echo "=== INTENT_AUTONOMY_HUMAN_REQUIRED by Reason (u1 event) ==="
find "$INTENTS" -path '*/audit/*.jsonl' -exec cat {} + \
  | jq -r "select($norm == \"INTENT_AUTONOMY_HUMAN_REQUIRED\") | (.attributes.Reason // .fields.Reason // \"(none)\")" 2>/dev/null \
  | sort | uniq -c | sort -rn
echo

echo "=== per-record autonomy transactions (non-zero only) ==="
for dir in "$INTENTS"/*/; do
  [ -d "$dir/audit" ] || continue
  n=$(cat "$dir"audit/*.jsonl 2>/dev/null \
      | jq -r "select($norm == \"INTENT_AUTONOMY_TRANSACTION_COMMITTED\") | 1" 2>/dev/null | wc -l | tr -d ' ')
  [ "$n" = "0" ] || echo "$(basename "$dir"): $n"
done
```

### 8.2 C3 形式の per-record 標本(`u5-sample.sh`)

```bash
#!/bin/bash
# u5 — per-record C3-shaped sample: the tx / question.answered / human.turn triple
# for the intents named in the C3 baseline plus this intent (the first
# post-application sample). Read-only; lives outside the repository (BR-U5-6).
#
# Usage: u5-sample.sh <repo-root> <record-dir> [<record-dir> ...]
set -euo pipefail

ROOT="${1:?usage: u5-sample.sh <repo-root> <record-dir>...}"
shift
INTENTS="$ROOT/amadeus/spaces/default/intents"
norm='(.attributes.Event // .event)'

printf '%-34s %6s %6s %6s %6s\n' record tx q.ans human.turn refusal
for rec in "$@"; do
  dir="$INTENTS/$rec/audit"
  [ -d "$dir" ] || { printf '%-34s %s\n' "$rec" "(no audit dir)"; continue; }
  blob=$(cat "$dir"/*.jsonl 2>/dev/null)
  tx=$(printf '%s' "$blob" | jq -r "select($norm == \"INTENT_AUTONOMY_TRANSACTION_COMMITTED\") | 1" 2>/dev/null | wc -l | tr -d ' ')
  qa=$(printf '%s' "$blob" | jq -r "select($norm == \"QUESTION_ANSWERED\") | 1" 2>/dev/null | wc -l | tr -d ' ')
  ht=$(printf '%s' "$blob" | jq -r "select($norm == \"HUMAN_TURN\") | 1" 2>/dev/null | wc -l | tr -d ' ')
  hr=$(printf '%s' "$blob" | jq -r "select($norm == \"INTENT_AUTONOMY_HUMAN_REQUIRED\") | 1" 2>/dev/null | wc -l | tr -d ' ')
  printf '%-34s %6s %6s %6s %6s\n' "$rec" "$tx" "$qa" "$ht" "$hr"
done

echo
echo "=== this intent: first autonomy transaction vs first HUMAN_TURN (ordering) ==="
rec="260807-autonomy-reachability"
blob=$(cat "$INTENTS/$rec/audit"/*.jsonl 2>/dev/null)
echo -n "first HUMAN_TURN:        "
printf '%s' "$blob" | jq -r "select($norm == \"HUMAN_TURN\") | (.timestamp)" 2>/dev/null | sort | head -1
echo -n "first autonomy tx:       "
printf '%s' "$blob" | jq -r "select($norm == \"INTENT_AUTONOMY_TRANSACTION_COMMITTED\") | (.timestamp)" 2>/dev/null | sort | head -1
echo -n "earliest audit row:      "
printf '%s' "$blob" | jq -r '.timestamp' 2>/dev/null | sort | head -1
```

## 9. 結論

- **FR-4a(述語)**: 充足。正準定数のみを使用し legacy `AUTONOMY_MODE_SET` は不使用
- **FR-4b(ベースライン)**: 充足。C1・C3 のみを引用し C2 は不使用
- **FR-4c(計測 ref)**: 充足。clone / SHA / 述語 / 測定時刻を §1 に明記
- **FR-4c(適用後の新規 intent での受け入れ)**: **PENDING** — 本 intent は修正の着地前に birth しているため標本にならない。閉包条件は §6 に明記
- u1 の拒否イベントと u3 の経路属性は **機構着地済み・観測待ち(PENDING)** — 閉包条件は §7 に明記

**本 intent 自身の時系列(birth 11:26:35Z → 最初の HUMAN_TURN 11:29:58Z)は、修正前の欠陥そのものの観測記録**である。この 3分23秒のギャップこそ u2 が閉じた対象であり、レポートはその before を保存している。after の観測は着地後に birth される次の intent が担う。

## 申し送り

FR-4c の閉包(§6)と観測待ちの2件(§7)は、着地後に birth される次の intent の record で確認する。本 intent のスコープでは実施できない(新規 intent の birth は別の workflow 行為であり、本 intent の record 内で行えばコーパスを汚染する)。
