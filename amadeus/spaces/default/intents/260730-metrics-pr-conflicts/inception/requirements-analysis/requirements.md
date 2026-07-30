# Metrics Snapshot PR 競合解消の要件

## Intent 分析

本 Intent の目的は、`main` commit ごとの metrics snapshot 履歴を失わずに、snapshot PR が共有 `metrics/index.html` と retention 削除を競合更新して滞留する不具合を解消することである。利用者価値は、開発者が [PR #1729](https://github.com/amadeus-dlc/amadeus/pull/1729) のような自動 PR を手作業で解消し続けなくても、snapshot 公開が重複せず収束し、失敗時には原因を観測できる状態を回復することにある。

変更種別は brownfield の `amadeus-bugfix`、対象は `.github/workflows/ci.yml`、repo-local な `scripts/metrics-*.ts`、および対応テストに限定する。成果物の深さは Minimal、テスト戦略は Comprehensive とする。

## 上流入力とトレーサビリティ

| 上流入力 | 本要件への反映 |
| --- | --- |
| `intent-statement` | 「snapshot の追記処理と単一 maintenance 処理への責務分離」「再実行の冪等化」を目的として採用 |
| `scope-document` | `amadeus-bugfix` の局所修正とし、metrics の業務スキーマ変更や framework 配布面の変更を除外 |
| `team-practices` | Bun-only、既存 CI・既存 metrics script の再利用、変更理由による所有権分離、検証可能な合否基準を適用 |
| `business-overview.md` | per-SHA JSON、単一 maintenance 所有者、最終 PR 状態照合を業務契約として採用 |
| `architecture.md` | Per-commit Snapshot Publisher と Single Maintenance Publisher の二境界を採用 |
| `code-structure.md` | `metrics-snapshot.ts`、`metrics-retention.ts`、`metrics-visualize.ts`、CI 配線、t221／t222 系テストを変更境界として採用 |
| `requirements-analysis-questions.md` Q1 | 成功条件を landed JSON または PR のマージ完了確認とし、競合・close・タイムアウトを失敗扱い |
| `requirements-analysis-questions.md` Q2 | maintenance 要求を単一の安定 branch／PR に集約し、並行世代を禁止 |
| `requirements-analysis-questions.md` Q3 | 完全 SHA 冪等化と、所有権を確認できる既存滞留物の安全な収束を採用 |
| `requirements-analysis-questions.md` Q4 | conflicting／closed を検出した run は回復後も非0とし、初期異常と最終状態を赤く可視化 |

## 機能要件

### FR-01 完全 SHA 単位の Snapshot 冪等性

**優先度:** Must
**要件:** Snapshot Publisher は snapshot JSON の `commit` フィールドに入る40桁の完全 commit SHA を正準な恒久識別子とする。`commit` は小文字 hexadecimal 40桁でなければならず、ファイル名の SHA prefix、captured_at、run attempt、branch 名は検索の手掛かりにだけ使用する。同一 SHA について `main` 上の有効な snapshot JSON、または同一 SHA を表す OPEN PR が存在する場合、下記の状態遷移契約に従い、新しい JSON・branch・PR の重複を作成してはならない。

**受入条件:**

- Given 同一完全 SHA の JSON が `main` に1件存在し、同一 SHA の PR／branch が残っていない、When snapshot 公開を再実行する、Then JSON・branch・PR を新規作成せず maintenance 要求を送り、その受付後に成功する。同一 SHA の滞留物があれば FR-03 の複合状態契約に従う。
- Given 同一完全 SHA の `OPEN/mergeable` PR が存在する、When snapshot 公開を再実行する、Then 既存 PR を再利用し、2本目の PR を作成しない。`OPEN/conflicting` は FR-03 の回復契約に従う。
- Given SHA 先頭12桁が同じでも完全 SHA が異なる、When snapshot 公開する、Then 別 commit として判定する。
- Given 同一 SHA を持つ有効 JSON が複数存在する、When既着地状態を照合する、Then重複を成功に丸めず、ファイル一覧を出力して fail-closed する。
- Given `commit` が40桁 hexadecimal でない、ファイル名 prefix と一致しない、または対象 SHA と一致しない、When既着地状態を照合する、Thenその JSON を正本にせず、理由付きで失敗する。

### FR-02 Snapshot PR の JSON-only 変更集合

**優先度:** Must
**要件:** Snapshot Publisher が作る PR の変更集合は、対象 SHA に対応する不変 JSON 1件の追加だけとする。`metrics/index.html` の更新、既存 JSON の削除、retention 実行を含めてはならない。

**受入条件:**

- Given 未公開 SHA、When snapshot PR を作成する、Then diff は `metrics/*.json` の追加1件だけである。
- Given `metrics/index.html` が古い、When snapshot PR を作成する、Then Snapshot Publisher は index を変更しない。
- Given保持件数が上限を超えている、When snapshot PR を作成する、Then Snapshot Publisher は旧 JSON を削除しない。

### FR-03 Snapshot 公開結果の照合

**優先度:** Must
**要件:** Snapshot Publisher は `gh pr merge --auto` の登録を完了条件にせず、対象 JSON の着地、同一 SHA に関係する全 PR／branch、maintenance 要求の受付を照合する。conflicting、closed-unmerged、branch-only、複数 PR／branch、または landed 後の滞留物を検出した run は **異常検出済み** を sticky に保持し、所有済み対象の自動回復を完遂しても必ず非0で終了する。異常を検出しない通常経路だけが、landed JSON 1件、関係する PR／branch 0件、maintenance 要求受付の3条件を満たして成功できる。

**受入条件:**

- Given PR が merged になった、When同一 SHA の PR／branch が0件であることと maintenance 要求の受付を確認する、Then異常検出のない通常 run だけが成功し、PR URL、merged 状態、dispatch receipt を出力する。
- Given PR が conflicting または未マージで closed になった、When所有済み対象の回復によって replacement PR が merged し maintenance 要求も受理された、Then最終収束状態を出力しつつ、初期異常を赤く可視化するため job は非0で終了する。
- Given PR が conflicting または未マージで closed になった、When所有済み対象の回復が未収束、または所有権を確認できない、Then job は非0で終了し PR URL、初期状態、回復処置、最終状態、不足証拠を出力する。
- Given制限時間内に merged を確認できない、When照合期限に達する、Then job は非0で終了し timeout を明示する。

#### Snapshot PR 状態遷移契約

**評価順序と複合状態:**

1. 処置前に、対象完全 SHA と一致する `main` 上の JSON 全件、OPEN／closed PR 全件、remote branch 全件を列挙する。単一状態を先取りせず、`landed + OPEN`、複数 OPEN、PR と branch の併存を同時に評価する。
2. 同一 SHA の有効 landed JSON が2件以上、または不正 JSON が1件でもあれば、PR／branch を変更せず fail-closed する。
3. 同じ対象集合に所有権不明の PR／branch が1件でもあれば、所有済み対象を含めて破壊的操作を行わず、全候補と不足証拠を出力して失敗する。
4. 有効 landed JSON が1件なら、新しい snapshot を作らず、所有済みの同一 SHA PR をすべて close し、対応 branch を remote head 一致条件付きですべて削除する。滞留物が1件でもあった run は異常検出済みとして非0を維持する。
5. landed JSON が0件で、所有済み `OPEN/mergeable` がちょうど1件、closed／conflicting／branch-only が0件なら、その1件を再利用する。
6. landed JSON が0件で PR／branch が0件なら、正準 branch／PR を1件作る。
7. landed JSON が0件で conflicting／closed／branch-only または複数 PR／branch があれば、所有済み PR をすべて close し、全 branch を remote head 一致条件付きで削除してから、正準 branch／PR を1件だけ再作成する。この run は回復後も非0を維持する。
8. 終了直前に全候補を再列挙し、landed JSON 1件、同一 SHA の OPEN PR 0件、remote snapshot branch 0件、maintenance 要求受付済みを確認する。1つでも満たさなければ失敗する。異常検出済みなら、全条件を満たしても非0で終了する。

| 観測状態 | 必須処置 | 当該 run の結果 | 収束条件 |
| --- | --- | --- | --- |
| `main` に有効 JSON が1件 landed、PR／branch なし | JSON／PR を追加せず maintenance 要求を送る | 要求受付後に成功 | 同一 SHA の landed JSON が1件、PR／branch が0件 |
| landed＋所有済み PR／branch | 全 PR を close し、全 branch を lease 条件付きで削除して maintenance 要求を送る | 最終収束後も異常検出済みとして失敗 | landed JSON 1件、PR／branch 0件 |
| 所有済み `OPEN/mergeable` が1件だけ | 既存 PR を再利用し、auto-merge を未登録なら登録して照合する | merged＋要求受付で成功。timeout／close は失敗 | landed JSON 1件、PR／branch 0件 |
| 所有済み `OPEN/conflicting`、`closed-unmerged`、`branch-only`、複数候補 | 所有済み PR／branch を全処置し、最新 `main` から正準 JSON-only branch／PR を1回だけ再作成して照合する | merged＋要求受付まで回復しても異常検出済みとして失敗 | landed JSON 1件、旧・新を含む PR／branch 0件 |
| 所有権不明、証拠不一致、API 応答不完全 | close、削除、force-push、再作成を行わない | 対象と不足証拠を出力して失敗 | 人間所有物へ変更0件 |

### FR-04 単一 Maintenance 所有者

**優先度:** Must
**要件:** `metrics/index.html` の再生成と retention 削除は Single Maintenance Publisher だけが所有する。Snapshot Publisher は landed を確認するたびに、metrics-only push の `paths-ignore` に依存しない明示的 dispatch で maintenance 要求を送信し、受付失敗時は自身を失敗させる。既着地を検出した再実行も要求を再送するため、失われた要求を回復できる。Maintenance Publisher は固定 concurrency group で要求を直列・集約し、安定した単一 branch／PR を create-or-update する。

**受入条件:**

- Given maintenance PR が存在しない、When landed snapshot を検出する、Then所定の安定 branch と PR を1本だけ作成する。
- Given maintenance PR が OPEN、When追加 snapshot が着地する、Then新しい PR を作らず、同じ branch／PR を最新 `main` 基準へ更新する。
- Given複数要求が短時間に到着する、When maintenance を実行する、Then同時に2世代の maintenance diff を公開しない。
- Given metrics-only merge が通常 CI の `paths-ignore` に一致する、When Snapshot Publisher が landed を確認する、Then通常 push trigger とは別の明示的 dispatch が maintenance 要求を受付済みにする。
- Given dispatch が失敗した、When Snapshot Publisher を再実行する、Then既着地 JSON を再生成せず maintenance 要求だけを再送し、受付を確認する。

#### Maintenance 集約・並行更新契約

1. 固定 concurrency lock を取得した後の最新 `main` head を **cutoff SHA** とし、その tree に存在する有効な landed JSON 集合を **cutoff 集合** とする。
2. index と retention は cutoff 集合だけから生成する。publish 直前に `main` と remote maintenance branch を再照合する。
3. `main` が cutoff SHA から進んだ場合は生成結果を破棄し、制限時間内に新しい cutoff で再計算する。remote maintenance branch が観測 head から進んだ場合は上書きせず、再取得・再計算する。
4. 所有済み maintenance branch の更新が non-fast-forward になる場合だけ、観測 remote head を明示した `force-with-lease` を許可する。lease 不一致では上書きせず再計算する。
5. 当該 run の cutoff 後に着地した snapshot は、それぞれが送る後続要求で処理する。要求を同じ1本の OPEN PR へ coalesce しても、cutoff を欠落させてはならない。
6. 完了時には、cutoff 集合に対する keep-last-360 の残存 JSON と `metrics/index.html` が `main` に一致することを再照合する。差分なしは no-op 成功、merged は成功、conflicting／closed-unmerged／timeout は失敗とする。

#### Maintenance PR 状態遷移契約

Maintenance Publisher も、差分判定より先に安定 branch に関係する OPEN／closed PR 全件と remote branch を列挙する。所有権不明が1件でもあれば変更せず失敗する。複数 PR、closed PR、`no-diff + OPEN`、PR と branch の不整合を検出した場合は、所有済み PR をすべて close し、branch を remote head 一致条件付きで削除してから cutoff を再計算する。差分があれば正準 branch／PR を1件だけ作り、差分がなければ作らない。異常を検出した maintenance run は回復後も非0で終了する。

| 観測状態 | 必須処置 | 当該 run の結果 |
| --- | --- | --- |
| cutoff 集合に対して差分なし、PR／branch なし | PR を作成せず `main` の index／retention を再照合 | 一致時に成功、不一致時に失敗 |
| 差分なし＋所有済み PR／branch、または複数候補 | 全 PR を close し全 branch を lease 条件付きで削除して再照合 | 最終収束後も異常検出済みとして失敗 |
| 所有済み PR なし | 安定 branch と PR を1本作成して auto-merge 後を照合 | merged＋事後条件成立で成功 |
| 所有済み `OPEN/mergeable` | 同じ branch／PR を cutoff の生成結果へ lease 付き更新 | merged＋事後条件成立で成功 |
| 所有済み `OPEN/conflicting` | 同じ branch を最新 `main` から再生成し、lease 付き更新。新規 PR は作らない | merged＋事後条件成立まで回復しても異常検出済みとして失敗 |
| 所有済み `closed-unmerged`、`branch-only`、複数候補 | 全所有済み対象を処置し、同じ安定名で branch／PR を1回再作成 | merged＋事後条件成立まで回復しても異常検出済みとして失敗 |
| 所有権不明、証拠不一致、API 応答不完全 | 一切変更しない | 不足証拠を出力して失敗 |

終了直前には、cutoff 集合に対する `main` の index／retention が一致し、OPEN maintenance PR 0件、remote maintenance branch 0件、所有権不明候補0件であることを再照合する。通常経路は全条件成立時だけ成功し、異常検出済み run は全条件成立後も非0で終了する。

### FR-05 Maintenance の決定的再構築

**優先度:** Must
**要件:** Maintenance Publisher は最新 `main` に着地済みの有効な snapshot JSON 集合だけを入力とし、既存の `METRICS_RETENTION_KEEP_LAST = 360` 契約に従って削除対象を計算し、残存集合から `metrics/index.html` を決定的に再生成する。snapshot JSON を新規生成してはならない。

**受入条件:**

- Given 361件以上の有効 JSON、When maintenance を実行する、Then最新360件だけを残す削除差分と、その残存集合を表す index を生成する。
- Given同じ `main` tree、When maintenance を複数回実行する、Then最初の適用後は追加差分を生成しない。
- Given不正な snapshot JSON、When入力を読む、Then既存 parser 契約どおり fail-closed し、不完全な index を公開しない。
- Given cutoff 集合が確定した、When maintenance PR が merged する、Then `main` の残存 JSON と index はその cutoff 集合に対する keep-last-360 の計算結果と一致する。

### FR-06 所有権を確認した滞留物の収束

**優先度:** Must
**要件:** 破壊的操作は、次の必須証拠がすべて完全一致する対象だけに許可する。1つでも不足・不一致、または API 応答が不完全なら fail-closed とし、close、delete、force-push を行わない。

**Snapshot PR の所有権証拠（すべて必須）:**

1. head repository が対象 repository と完全一致する。
2. PR author が現在の Metrics GitHub App bot identity と完全一致する。
3. branch が新形式 `metrics/snapshot-<40桁完全SHA>`、または legacy 形式 `metrics/snapshot-<12桁SHA prefix>-<正整数attempt>` に完全一致する。
4. PR diff は snapshot JSON 1件の追加だけであり、その JSON は schema 検証を通り、`commit` が対象完全 SHA と完全一致する。legacy branch では JSON の完全 SHA が branch prefix とも一致する。
5. 新形式 PR は Publisher が付与する固定 machine marker を title または body に持つ。legacy PR は既存の固定 title prefix、bot author、JSON-only diff の3証拠を合わせて marker の代替とする。

**Branch-only の所有権証拠（すべて必須）:** branch 名の形式、tip commit author の bot identity、対象 `main` との差分が有効な対象 SHA の JSON 1件だけであること、観測した remote head SHA が操作直前にも一致すること。

**Maintenance PR／branch の所有権証拠（すべて必須）:** 安定 branch 名、対象 repository、Metrics GitHub App bot identity、固定 machine marker、差分が `metrics/index.html` と retention 対象 JSON の削除だけで snapshot 追加を含まないこと、観測 remote head SHA の一致。

**受入条件:**

- Given同一 SHA の bot 所有 OPEN PR、When再実行する、Then既存 PR を再利用する。
- Given bot 所有と確認できる conflicting／close 済み PR と残存 branch、When回復処理を行う、Then対象を明示して収束させる。
- Given人間所有または所有権不明の branch、When回復候補を走査する、Then削除・force-push・close を行わず非対象として報告する。
- Given所有権 API の必須 field が欠落する、When回復候補を判定する、Then対象外に丸めず、変更0件のまま非0で終了する。

### FR-07 CI 起動境界と非再帰性

**優先度:** Must
**要件:** 通常コード変更による `main` push は snapshot 公開を起動し、metrics-only merge は新たな snapshot 公開を再帰起動してはならない。既存の `push.paths-ignore: metrics/**` を維持する。metrics snapshot 系 job は既存の `ci-success` blocking 集約へ追加しないが、各 job 自身の失敗は赤く可視化する。

**受入条件:**

- Given通常コードの `main` push、When CI が評価される、Then coverage 対象時に Snapshot Publisher が起動する。
- Given metrics-only PR の merge、When CI が評価される、Then Snapshot Publisher を起動しない。
- Given snapshot または maintenance の照合失敗、When workflow が完了する、Then該当 job は失敗表示となるが既存 `ci-success` の依存集合は変わらない。

## 非機能要件

### NFR-01 信頼性と収束性

同一完全 SHA の再実行を少なくとも3回行っても snapshot JSON・OPEN PR は各1件を超えないこと。短時間に3件以上の異なる snapshot 要求を処理しても、snapshot PR の共有ファイル競合は0件であり、remote maintenance branch と OPEN maintenance PR は各最大1件であること。maintenance 完了時には cutoff 集合に含まれる全 landed snapshot が index／retention 計算へ反映され、古い run による新しい remote head の上書きは0件であること。

### NFR-02 実行時間と観測可能性

各 Publisher は無期限に待機せず、workflow の既存 `timeout-minutes: 5` 以内に成功または理由付き失敗へ到達すること。失敗出力には対象完全 SHA、PR URL（存在する場合）、観測状態、timeout／conflict／closed の分類を含めること。

### NFR-03 セキュリティと変更権限

既存 Metrics GitHub App の `contents: write` と `pull-requests: write` を超える権限を要求しないこと。通常経路で `main` へ直接 push せず PR 経由を維持し、既存滞留物の変更は自動生成の所有権を確認できた対象だけに限定すること。

## 制約

- Bun 1.3.13 と既存 GitHub Actions／`gh` CLI を使用する。
- `scripts/metrics-timeseries.ts` の fail-closed parser、`scripts/metrics-retention.ts` の keep-last-360、`scripts/metrics-visualize.ts` の決定的レンダリングを再利用する。
- framework core、各 harness の `dist`、self-install 面は変更しない。
- `metrics/**` のみの push を snapshot 起動対象から除外する。
- `ci-success` は snapshot／maintenance job に依存させない。
- 新旧 Publisher の二重運用や互換 shim は導入しない。

## 前提

- GitHub App は対象 repository で PR 作成・更新・auto-merge・branch 削除に必要な既存権限を持つ。
- Repository 側で auto-merge が利用可能である。利用不能または拒否された場合は成功に丸めず、FR-03 の失敗として扱う。
- snapshot JSON の完全 SHA は schema 検証済み JSON の `commit` フィールドを唯一の正準値として一意に照合できる。
- 既存の自動生成 PR／branch は命名規約と bot 所有者から人間作成物と区別できる。

## スコープ外

- metrics JSON の業務スキーマ、collector、coverage 判定値の変更。
- `METRICS_RETENTION_KEEP_LAST = 360` の値変更。
- GitHub Actions 以外の scheduler、queue service、database の導入。
- metrics dashboard の表示仕様変更。
- 自動生成と確認できない人間所有 PR／branch の close、削除、force-push。
- metrics 公開と無関係な CI job や repository 全体の concurrency 再設計。

## テスト戦略と追跡

Comprehensive 戦略として、決定ロジックは unit、Git／`gh` 境界と workflow 配線は hermetic integration、既存 CI 契約は回帰テストで検証する。実 repository を変更する live E2E、実時間5分待機、負荷試験は、決定的な fake／短縮可能な polling seam で同じ契約を検証できるため実施しない。

| 要件 | 主な検証 |
| --- | --- |
| FR-01 | 完全 SHA の既着地／OPEN PR／prefix 衝突／3回再実行の unit・integration |
| FR-02 | JSON 1件だけを stage し、index・削除を含めない workflow wiring test |
| FR-03 | fake `gh` による landed＋OPEN、複数 OPEN、OPEN-mergeable、OPEN-conflicting、closed、branch-only、unknown-owner、timeout、回復後 sticky failure の状態遷移 integration |
| FR-04 | 明示 dispatch の受付・再送、no-diff＋OPEN、複数 maintenance PR、cutoff 再評価、lease 不一致、要求 coalesce、最終全対象再照合の integration |
| FR-05 | 359／360／361件境界、不正 JSON、同一 tree 再実行 no-op の unit・integration |
| FR-06 | 新形式／legacy／branch-only／maintenance の必須証拠 AND 条件、欠落 field、remote-head 変化、人間所有の表形式 unit と操作 receipt integration |
| FR-07 | `paths-ignore`、通常 push、metrics-only push、`ci-success` 非依存の t222 回帰 |
| NFR-01 | 異なる3 SHA と同一 SHA 3回の収束シナリオ |
| NFR-02 | 短縮 polling seam による deadline、分類、出力必須フィールドの deterministic test |
| NFR-03 | GitHub App の最小権限、PR-only、所有権 guard の静的 workflow／integration test |

## 未解決事項

要件生成時点の未解決事項はない。実装方式の詳細は、既存 workflow 内の shell を分割するか repo-local helper script を導入するかを Code Generation で、上記要件と最小変更原則に照らして決定する。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-30T11:56:14Z
- **Iteration:** 1
- **Scope decision:** none

Q1〜Q3 の回答と責務分離の上流追跡は良好だが、競合 PR の状態別処理、Maintenance の起動・完了契約、破壊的操作の所有権判定が未確定である。

### Findings

- [重大] 同一 SHA の OPEN/conflicting PR について再利用・失敗・置換の適用順序が一意でない。状態別の処置と収束条件が必要。
- [重大] paths-ignore 下で Maintenance を必ず開始する契約、要求の集約・再試行、状態別 job 結果が不足。
- [重大] 自動生成物の所有権判定が例示に留まり、AND/OR 条件と fail-closed 処置が不明。
- [高] maintenance の古い run が新しい head を上書きせず、完了時に必要な landed JSON 集合を含む事後条件が不足。
- [高] 完全 SHA の正準な照合元と legacy 重複・不正 metadata・prefix 衝突時の処置が不足。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-30T12:00:47Z
- **Iteration:** 2
- **Scope decision:** none

dispatch 到達保証、cutoff/lease、所有権 AND 条件、完全 SHA 正準値は改善したが、承認済み Q1 と競合回復後成功の契約が矛盾し、複合状態の収束処置が不足する。

### Findings

- [重大] Q1 と Architecture は conflicting/closed の失敗・OPEN PR 再利用を示す一方、FR-03 は同一 run で close・再作成後に成功でき、明示的な回答確認なしに契約を変更している。
- [重大] landed+OPEN、no-diff+OPEN maintenance、複数 OPEN、PR+branch の複合状態について評価優先順位と全対象処置が未定義。
- [高] FR-03 の merged 受入条件に maintenance dispatch 受付がなく、FR-04 の成功条件と矛盾する。
