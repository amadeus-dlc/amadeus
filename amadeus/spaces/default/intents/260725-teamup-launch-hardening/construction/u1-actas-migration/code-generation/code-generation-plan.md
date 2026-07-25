# Code Generation Plan — U1: actas 移行と待機設計（#1476）

上流入力（consumes 全数）: `amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-rules.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/business-logic-model.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/functional-design/domain-entities.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-design/logical-components.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-design/performance-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-design/reliability-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/construction/u1-actas-migration/nfr-design/security-design.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/units-generation/unit-of-work.md`、`amadeus/spaces/default/intents/260725-teamup-launch-hardening/inception/requirements-analysis/requirements.md`

- `business-rules.md` — BR-1〜BR-22 を実装の受け入れ条件とした。特に BR-5（`" actas "` の有無が role に依存しない）はテストで固定した。
- `business-logic-model.md` — 「移動前後の対応」表に従って検証ブロックのみを移動し、`start_safety_wait_supervisors` の位置を保った。
- `domain-entities.md` — 所有境界（team-up.sh が持つ member/role/prompt と、agmsg が持つ delivery mode/watcher/sentinel/actas ロック）を引き、変更範囲を左側に限定した。INV-3（`" actas "` の有無が role 非依存）は BR-5 のテスト固定と対応する。
- `logical-components.md` — C-1〜C-11 の契約に従い、新設は `member_bootstrap_prompt` の1関数、廃止は `CLAUDE_MONITOR_PROMPT` のみとした。
- `performance-design.md` — D-P2 の `WATCHER_READY_TIMEOUT` = 60（実測 32.2秒 の約1.86倍）とマージン根拠のコメント要求を実装した。
- `reliability-design.md` — D-R2（診断3行）、D-R3（スキップ通知のラッチ維持）、D-R4（`delivery.sh set monitor` の保存）、D-R7（2キー grep）に従った。
- `security-design.md` — D-S1 に従い `printf '/agmsg actas %s' "$role"` とし、文字列連結・`eval` を避けた。
- `unit-of-work.md` — U1 の作業項目7件と「完了の定義」を実装スコープの境界とした。規模見積り（正本 約48行増/13行減）に対する実績は本書の変更ファイル節に記す。
- `requirements.md` — FR-1〜FR-5 / NFR-1〜NFR-8 を最終的な受け入れ基準とした。NFR-3（actas 排他ロックの実測）は conductor による実 launch で充足を確認した（本書「実 launch による受け入れ検証」節）。

- `business-rules.md` — BR-1〜BR-22 を、下記の実装単位と検証条件へ1:1で割り付けた。特に BR-18 の2キー棚卸しを着手時の実測手順とした。
- `business-logic-model.md` — 「移動前後の対応」表を、制御フロー移動（実装単位4）の唯一の正本とした。
- `logical-components.md` — C-1〜C-11 の契約を、各関数・定数の実装契約として引いた。
- `performance-design.md` — D-P1（検証の移動）と D-P2（タイムアウト 60秒 とマージン根拠）を、実装単位4・5の内容とした。
- `reliability-design.md` — D-R2（診断3行）と D-R7（2キー是正手順）を、実装単位6と着手手順とした。
- `security-design.md` — D-S1 の `printf '%s'` 実装形を、実装単位1のコード verbatim として採用した。

測定 ref: 着手時 HEAD `ec624022f`、ブランチ `feat/teamup-actas-migration-and-worktree-parallel`。

## 着手時の実測（2キー棚卸し、BR-18 / D-R7）

設計成果物の表を複製せず、着手時に両キーで grep を再実行した（`cid:functional-design:inventory-from-grep-each-time`）。

| キー | 実行コマンド | 件数 |
|---|---|---|
| キー1: 変数名 | `grep -rn "CLAUDE_MONITOR_PROMPT" packages/framework/core/tools/team-up.sh tests/ scripts/ docs/` | 10 |
| キー2: リテラル | `grep -rn "agmsg mode monitor" packages/framework/core/tools/team-up.sh tests/ scripts/ docs/` | 6 |

行の重複（`team-up.sh:104` が両キーに現れる）を除いた**一意行は15**。設計表の「13件」は `CREATED_MEMBERS`（U2 対象）を含むキー1 の集計であり、U1 の対象は上記15行のうち U2 分（`:1244` / `:1306` / `:1392`）を含まない。`scripts/` と `docs/` は両キーとも 0 hit で、設計時の実測と一致した。

## 実装単位

| # | 対象 | 設計根拠 | 内容 |
|---|---|---|---|
| 1 | `member_bootstrap_prompt` 新設 | C-1、BR-1〜BR-5、D-S1 | `member_role` の直後に定義。`printf '/agmsg actas %s' "$role"` |
| 2 | `claude_member_cmd` の `init_prompt` | BR-18 キー1 #2 | `member_bootstrap_prompt "$m"` から導出。`else init_prompt=""` は関数側が空を返すため削除 |
| 3 | `watcher_verification_applies` の判定入力 | C-3、ADR-2、BR-6 | `case "$(member_bootstrap_prompt leader)"`。ラッチは不変 |
| 4 | 検証ブロックの移動 | C-10、D-P1、BR-8 | `:1477-1480`（`watcher_status=0` を含む）を run record 確定の後へ。`start_safety_wait_supervisors` と stale sentinel クリアは位置不変 |
| 5 | `WATCHER_READY_TIMEOUT` | C-6、D-P2、BR-15 | 90 → 60。実測 32.2秒 の約1.86倍である旨をコメントに記す |
| 6 | 診断2行 | C-9、D-R2、BR-12〜BR-14 | `:1210` を actas の事実へ。`:1211` を未 armed メンバーごとの1行出力へ |
| 7 | テスト是正 | BR-5、FR-5 | t294 / t-team-up-watcher-arming を新実装の駆動へ移し、BR-5 不変条件を固定 |
| 8 | 配布同期 | BR-22 | `bun scripts/package.ts` + `bun run promote:self` |

## 定数の廃止（BR-17）

`CLAUDE_MONITOR_PROMPT` は別名・フォールバックを残さず削除した。廃止の実証としてテストで未定義であることを assert する（`org.md` Forbidden の互換シム禁止）。

## テストの設計

| テスト | 対象ルール | 内容 |
|---|---|---|
| the shipped bootstrap prompt is the actas form | BR-1 | 3 member（`leader` / `engineer-1` / `engineer-6`）で導出し `/agmsg actas <role>` を検証。`member_role` の case 両腕を通す |
| the ' actas ' marker is present for every role | **BR-5 / ADR-2** | 全 role で `" actas "` の有無が一致することを固定。ADR-2 の代表 role 判定の根拠 |
| the herdr backend derives an empty bootstrap prompt | BR-2 | 空文字を検証。関数不在でも空になる vacuity を `declare -F` ガードで塞ぐ |
| codex runtime and herdr backend stay inapplicable | BR-6 | env 上書きでなく `RUNTIME` / `MSG_BACKEND` 軸で駆動 |
| the skip is announced exactly once | BR-7 | 既定構成では到達しない分岐のため、`member_bootstrap_prompt` を非 arming 形へ上書きして駆動（D-R3 の「将来の構成変更に備えて残す」ラッチの被覆） |
| budget constants are retained | BR-15、BR-16 | `60 1` を assert |
| CLAUDE_MONITOR_PROMPT is fully retired | BR-17 | 未定義を assert |
| recovery guidance（arming 側） | BR-14 | メンバーごとの `<member>: /agmsg actas <role>` 行を検証 |

新規テストファイルは作らなかった。対象2ファイルが既に該当のシームを駆動しており、`t295` 以降の新設は同じシームの重複になるため。

## 検証手順

```
bun run typecheck
bun run lint
bun scripts/package.ts && bun run promote:self
bun run dist:check
bun run promote:self:check
bash tests/run-tests.sh --ci
```

落ちる実証は、修正コミット後に `git checkout <fix-sha>~1 -- packages/framework/core/tools/team-up.sh` で pre-fix 面を復元して行う（stash を使わない — `cid:code-generation:falling-proof-no-stash`）。注入面はテストが実際に読む面（`TEAM_UP_LIB_ONLY=1` で source される正本）である。

## 実施しなかったこと

| 項目 | 理由 |
|---|---|
| BR-21（7人同時起動と resume での actas ロック競合の実測） | 実 launch を要し、隔離インスタンスでの起動は本ステージのサンドボックス外。conductor へ引き渡す |
| U2 対象の `CREATED_MEMBERS` 3箇所 | 行域が非交差で U2 の責務（`logical-components.md` § U2 との適用順序） |
