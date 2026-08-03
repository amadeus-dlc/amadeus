# Performance Design — scope-ledger (U6 / FR-6a)

上流入力(consumes 全数): business-logic-model.md(補足: stage frontmatter の nfr-requirements 系5 consumes(performance/security/scalability/reliability-requirements・tech-stack-decisions)は、本 scope(self-feature)が nfr-requirements(3.2)を SKIP するため engine の解決済み directive では消費対象外 — 実 directive の consumes は business-logic-model.md の1件のみで、upstream-coverage センサーは解決済み宣言に対し全 PASSED を実測済み。性能・信頼性等の要件出典は intent 直下 requirements.md の NFR 群 — 宣言外の追加入力として本文で引用)

宣言外の追加入力(同 unit の FD): business-rules.md(本文で実参照)。

測定 ref: repo 内 file:line は **worktree HEAD `26fc7ddb29228757d40e3d15d6d8c0513d505f63`**(`git rev-parse HEAD` の出力転記)の実測。

## 1. 判定: 実行時性能面は N/A(根拠付き)

本 unit は Markdown 文書1件を生成するのみで、実行される構成要素を持たない。business-logic-model.md §1 実文 `本 unit は **文書1本を生成するだけの unit** であり、実行可能な振る舞い(プロダクションコード・テスト・CI)を一切持たない。` が根拠である。

したがって次の性能関心は**発生面が存在しない**:

| 関心 | 判定 | 根拠 |
| --- | --- | --- |
| レイテンシ(p50/p95/p99) | N/A | 応答する処理が無い |
| スループット | N/A | 処理する要求が無い |
| 実行時間の上限 | N/A | 実行されるコードが無い(下記 §2 の NFR-4 も非適用) |
| メモリ・CPU 使用量 | N/A | 常駐・実行するプロセスが無い |
| キャッシュ設計 | N/A | 繰り返し取得される計算結果が無い。cid:nfr-design:c1 に従い、常駐 service 向け機構を機械適用せず決定的 file 境界へ置換した |
| ベンチマーク・回帰上限 | N/A | 計測対象が無い。存在しない対象へのベンチマーク baseline は検証劇場になる |

## 2. NFR-4(決定性・2秒以内)の非適用

requirements.md `:58` NFR-4 実文の実行時間基準は `新規 PBT ファイル群の \`bun test\` 直接実行の合計が **2秒以内**` であり、対象は**新規 PBT ファイル群**である。本 unit は PBT を含むテストを一切持たない — business-rules.md `:36` 実文 `PBT の4項規約(component-methods.md \`## 全メソッド共通の規約(FR-4c)\`)は本 unit に適用されない — 本 unit はテストを持たない。`

同じ理由で `PBT_SEED` 等の固定 seed 設計も本 unit に適用されない(決定性そのものについては reliability-design.md §3 で、転記のみで構成されることによる再現性として扱う)。

## 3. CI 面の負荷: 追加ゼロ

- 本 unit は `.github/workflows/` を触らない(business-rules.md `:27` BR-SL-13 実文 `書込面は本台帳1ファイルのみ。他 unit の面(\`tests/\`、\`.github/workflows/\`、\`packages/\`)へ触れない`)。CI ジョブの追加・変更が無いため、CI 実行時間への寄与は**構造的にゼロ**である。
- record 直下への Markdown 追加が既存 CI ジョブの実行時間へ与える影響は、チェックアウト対象ファイルが1件増えることのみで、有意な寄与を持たない。これは**設計上の帰結であり実測ではない** — 数値の断定を避け、上限値も置かない(照合できない数値を書かないため)。

## 4. 人間側のコスト(唯一の実質的な「性能」)

本 unit で唯一意味を持つ効率指標は、台帳の**検査に要する手数**である。business-logic-model.md §5 の A1〜A5 はいずれも `test -f` / `grep -c` / 行数照合という単発コマンドで完結し、合計 5 ステップで受入判定が終わる。

- 設計上の選択: 検査述語をローカル完結(ネットワーク非依存)に保つことで、reviewer の検査が GitHub 応答時間・rate limit に律速されない(詳細は reliability-design.md §2 R-4)。
- 分量の上限は business-rules.md `:26` BR-SL-12 が `\`wc -l\` が 40〜60 の範囲` と既に定めており、本書はこれを性能面から追加制約しない(二重規定を作らない)。

## 5. 保証の層別

| 層 | 保証 | 非保証 |
| --- | --- | --- |
| 生成面 | 実行時コストの発生源を持たない(§1) | — |
| CI 面 | ジョブ追加ゼロ(§3) | 既存ジョブの実行時間そのもの(他 unit・既存資産の所有) |
| 検査面 | 5 ステップ・ローカル完結(§4) | reviewer の読解時間(人的要因、機械保証の対象外) |

## 6. 上流参照の補足

- business-logic-model.md §6 実文 `本 unit は \`packages/framework/core/\` を触らないため、unit-of-work.md \`:29\` が election-readpath に課す投影条件(dist 7 ハーネス再生成・\`dist:check\` / \`promote:self:check\`)は**適用されない**。` — 投影再生成に伴うビルド時間の増加も本 unit には生じない。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:28:14Z
- **Iteration:** 1
- **Scope decision:** none

FD 逸脱・二重規定なし、数値規律・N/A 根拠は概ね適切。consumes 5件の沈黙+requirements.md 直引用の宣言外未申告の Major で REVISE(GoA 5)。

### Findings

- [Major] 5成果物ヘッダが宣言 consumes 6件中 business-logic-model.md のみ列挙 — stage frontmatter の nfr-requirements 系5件への参照・N/A 根拠が沈黙(注: 実測では engine 解決済み directive の consumes は1件のみで sensors 60/60 PASSED — 残る実質は SKIP 根拠の明記) + performance/scalability の requirements.md 直引用が宣言外追加入力として未申告

## Review — Iteration 2

- **Verdict:** READY
- **Reviewer:** amadeus-architecture-reviewer-agent
- **Date:** 2026-08-02T23:31:54Z
- **Iteration:** 2
- **Scope decision:** none

Major(consumes 沈黙+requirements.md 未申告)は SKIP 補足注記で閉包し、state の nfr-requirements SKIP と整合を実測確認。新規誤りなし。GoA 2。

### Findings

- None
