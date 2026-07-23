# 要件定義 — archived intent status guard

## 上流入力と意図分析

本要件は `intent-statement` と `scope-document` を要求の正本とし、brownfield の実装境界は `business-overview`、`architecture`、`code-structure`、実装規律は `team-practices` から導出した。ユーザーが達成したい結果は、intent の終了判断を自由文字列ではなく一級のライフサイクル状態として表現し、`archived` intent が通常操作によって誤って再開される経路を機構的に閉じることである。

対象は Issue #1396 の status 語彙、archive/unarchive、選択・再開・unpark の拒否、既存 `closed` データの移行、および falling proof である。深度は Standard、テスト戦略は Comprehensive とする。

## ライフサイクル語彙

### FR-01: status の閉じた語彙

- intent registry の status は `in-flight`、`parked`、`complete`、`archived` の4値だけを表現できなければならない。
- status を受け取る公開・内部 chokepoint は、不正値を永続化前に loud エラーで拒否しなければならない。
- `closed` は互換 alias として受理せず、移行対象データ以外では不正値として扱わなければならない。

合否基準:

- 4値は型検査と実行時検査の両方を通過する。
- `closed` および任意の未知値を渡すと非ゼロ終了または `kind: "error"` になり、registry、cursor、audit の呼出前 bytes が変化しない。

### FR-02: status 更新の単一契約

- registry status を変更するすべての呼出しは、同一の検証済み status 契約を経由しなければならない。
- 呼出側ごとの文字列分岐や旧 `closed` 互換分岐を追加してはならない。

合否基準:

- repository corpus で status 更新経路を列挙し、4値検証を迂回する書込経路が0件である。
- 配布物と自己インストール面が正本 core と同期している。

## Archive / Unarchive 操作

### FR-03: `archive` 専用 verb

- `archive` は `in-flight`、`parked`、`complete` のいずれからも `archived` へ遷移できなければならない。
- 実 HUMAN_TURN による human-presence がない呼出しを拒否しなければならない。
- 対象が active-intent cursor の指す intent である場合、status 更新と cursor 解除を一つの論理トランザクションとして完了しなければならない。
- 成功時は専用の監査イベントに対象 intent、遷移元、遷移先、operation ID、ユーザー入力、消費した HUMAN_TURN の timestamp を記録しなければならない。operation ID は transaction journal 作成時に一度だけ生成し、同一 journal の再実行を識別する重複判定キーとする。

合否基準:

- 3種類すべての遷移元から `archived` への成功を個別に確認できる。
- active intent の archive 成功後、active-intent cursor は未選択である。同じ workspace lock を用いる公開 CLI の読取りからは、status が `archived` なのに cursor が対象を指す中間状態、または cursor が解除済みなのに status が遷移前である中間状態のどちらも観測されない。
- human-presence 欠如、対象不在、既に archived などの失敗時は registry、cursor、audit が呼出前 bytes を保つ。
- 成功監査イベントの HUMAN_TURN timestamp は、その操作が消費した未使用 HUMAN_TURN 行の timestamp と一致し、同じ operation ID の成功イベントは1件だけである。

### FR-04: `unarchive` 専用 verb

- `unarchive` は `archived` だけを遷移元として受理し、成功時は常に `in-flight` へ遷移させなければならない。
- 実 HUMAN_TURN による human-presence がない呼出しを拒否しなければならない。
- `unarchive` 自体は active-intent cursor を自動設定してはならない。復帰後の選択は通常の intent 選択操作に委ねる。
- 成功時は専用の監査イベントに対象 intent、`archived` → `in-flight`、operation ID、ユーザー入力、消費した HUMAN_TURN の timestamp を記録しなければならない。operation ID は transaction journal 作成時に一度だけ生成し、同一 journal の再実行を識別する重複判定キーとする。

合否基準:

- `archived` から `in-flight` への成功を確認できる。
- 非 archived status または human-presence 欠如では loud エラーとなり、registry、cursor、audit が呼出前 bytes を保つ。
- 成功監査イベントの HUMAN_TURN timestamp は、その操作が消費した未使用 HUMAN_TURN 行の timestamp と一致し、同じ operation ID の成功イベントは1件だけである。

## 誤再開ガード

### FR-05: archived intent の選択拒否

- 通常の intent 選択操作は archived intent を active-intent cursor に設定してはならない。
- 選択操作への `--force`、`--unarchive`、読み取り専用選択などの迂回路を設けてはならない。
- エラーは対象が archived であることと、先に human-presence 必須の `unarchive` を実行すべきことを示さなければならない。

合否基準:

- 現在の公開選択入口である intent 名指定、record-dir 指定、および cursor を書き込む内部 helper は、設計時に確定する単一 selector resolver chokepoint を必ず通る。repository corpus でその chokepoint の全 caller を列挙し、各 caller から archived intent の選択が拒否される。
- 拒否後に active-intent cursor と registry が変化しない。

### FR-06: `next` の防御的拒否

- legacy データ、手動編集、競合などにより active-intent cursor が既に archived intent を指していても、`next` は stage directive を返してはならない。
- 拒否は state や audit に stage 開始・進行・完了イベントを書き込む前に行わなければならない。

合否基準:

- archived intent を指す stale cursor fixture に対する `next` が loud エラーになる falling proof が、修正前に赤、修正後に緑となる。
- 拒否後に Current Stage、stage checkbox、audit の bytes が変化しない。

### FR-07: `unpark` の防御的拒否

- archived intent に対する `unpark` は、record に park marker が残っているか否かに関係なく拒否しなければならない。
- 拒否時に status を `in-flight` へ戻したり、park marker を削除したりしてはならない。

合否基準:

- archived + parked fixture と archived + unparked fixture の双方で loud エラーとなり、registry、state、audit の bytes が変化しない。

## 既存データ移行

### FR-08: 260713-swarm-driver-migration の移行

- `260713-swarm-driver-migration` の registry status を、既存の `closure-note.md` に記録されたユーザー裁定を根拠として `closed` から `archived` へ置換しなければならない。
- 移行は他の intent の status を変更してはならない。
- 移行後の registry 全行は FR-01 の4値に適合しなければならない。

合否基準:

- 対象1件だけが `archived` になり、registry に `closed` または未知 status が0件となる。
- 対象 intent への選択、`next`、`unpark` が FR-05〜FR-07 に従って拒否される。

## 非機能要件

### NFR-01: 原子性

- archive/unarchive の status、cursor、audit を、同じ workspace lock と永続 transaction journal の下で一つの recoverable logical transaction として扱う。複数ファイルを単一 filesystem atomic write で更新することは要求しない。
- journal は対象 intent、verb、遷移元、遷移先、生成済み operation ID、各 commit step の完了状態を保持する。operation ID は新規 journal 作成時に tool が UUID として一度生成し、未完了 journal の再実行・起動時 recovery・監査重複判定で同じ値を再利用する。caller に operation ID の指定を要求しない。
- 同じ intent と verb の未完了 journal が存在する場合、新規 operation ID を生成せず、その journal を recovery してから結果を返す。完了済み journal は削除または完了 marker 化し、同一要求の通常再実行を新しい操作として扱う。
- 保証対象は workspace lock を経由する repository 提供の公開 CLI と helper である。これらは lock 取得直後、registry・cursor・audit を読む前に未完了 journal を recovery する。外部プロセスによる raw filesystem 読取りは対象外とする。
- validation または journal 永続化前の失敗では、registry、cursor、audit は呼出前 bytes を保つ。journal 永続化後の失敗では、journal だけが残り、次回 recovery が同じ operation ID で処理を継続する。
- audit commit 後の registry write 失敗では、audit に同じ operation ID の成功イベントが1件、registry と cursor は呼出前 bytes、journal は audit 完了状態となる。recovery は監査を重複させず registry、続いて cursor を成功時 bytes へ収束させる。
- registry write 後の cursor write 失敗では、audit と registry は成功時 bytes、cursor は呼出前 bytes、journal は cursor 未完了状態となる。archived guard はこの間も `next` を拒否し、recovery は cursor だけを成功時 bytes へ収束させる。
- journal 完了前のどの durable 中間状態でも、lock を経由する reader は recovery 完了後の状態だけを返す。したがって公開 CLI からは status と cursor の不整合を観測できない。
- failure injection は少なくとも validation、journal write、audit pre-validation、audit commit、registry write、cursor write、journal completion の7境界に置き、上記の期待 bytes、operation ID の同一性、成功監査イベント1件を比較する。

### NFR-02: 診断可能性

- 対象 intent が解決できた拒否は silent no-op や汎用 parse error ではなく、対象 intent、現在 status、拒否した操作、必要な復旧操作を含む。
- 対象不在の拒否は現在 status を要求せず、入力 selector、拒否した操作、対象不在である理由、利用可能な復旧操作を含む。
- CLI 境界では機械判定可能な非ゼロ終了または typed error directive を維持する。

### NFR-03: テスト容易性

- 次の拒否経路を独立した fixture と assertion で固定する: cursor 設定、stale cursor からの `next`、`unpark`、human-presence のない archive/unarchive、不正 status 更新。
- 各エラー経路テストは、目的の分岐を実際に通過したことを coverage で確認し、同一 exit code の別経路による偽 green を認めない。
- registry、cursor、state、audit の不変条件を bytes 比較で検証する。

### NFR-04: 配布整合性

- 正本は `packages/framework/core` とし、各 harness 配布物および self-install 面の drift check を通す。
- 新しい status 型、verb、監査イベント、エラーメッセージ、テスト fixture の伝播漏れを認めない。

## 制約

- registry へ `parked` を書き込む機能、および既存 park/unpark の通常挙動変更は対象外である。`parked` は本 intent では語彙契約にのみ含める。
- `complete` の既存意味論を変更しない。
- #1309 の projection、Catalog、共通契約 interface、および elections 側の構造統一を実装しない。
- `closed` の互換 alias、移行 shim、新旧二重実装を追加しない。
- archive/unarchive 以外の汎用 force override を追加しない。

## 前提

- `260713-swarm-driver-migration/closure-note.md` は対象 intent を再開不可として archive するための既存ユーザー裁定証跡である。
- `archive` / `unarchive` に必要な human-presence は、既存 HUMAN_TURN guard と同じ検証面を再利用できる。
- status 更新には既存の単一 chokepoint があり、公開契約を深く保ったまま検証を集約できる。
- registry への `parked` 投影は別 intent で扱われるため、本実装で status 語彙との一時的な表現差を解消しない。

## 対象外

- archived intent の読み取り、一覧表示、履歴参照を禁止すること。
- archived intent を自動的に別 status へ戻す time-based policy。
- archive 時に別の active intent を自動選択すること。
- archive 前 status の保存・復元。
- 既存 intent 全件のライフサイクル再分類キャンペーン。

## トレーサビリティ

| 要件 | 上流根拠 | 回答 |
|---|---|---|
| FR-01〜02 | intent-statement 達成基準1、scope-document S1/C8、team-practices | Q5 |
| FR-03 | scope-document S3、intent-statement E-ASGIC1 | Q1、Q3 |
| FR-04 | scope-document S3、intent-statement E-ASGIC1 | Q2 |
| FR-05〜07 | intent-statement 達成基準2、scope-document S2 | Q3〜Q5 |
| FR-08 | intent-statement 達成基準3、scope-document S4 | Q5 |
| NFR-01〜04 | team-practices、architecture、code-structure | Q3、Q5 |

## 未解決事項

要件生成を妨げる未解決事項はない。application-design では、既存 status chokepoint、human-presence guard、atomic audit/state write の再利用境界と、`archive` 成功時の cursor 解除順序を設計判断として確定する。

## Reviewer指摘への対応

- Iteration 1 の対象不在診断、HUMAN_TURN 証跡、selector 母集団は NFR-02、FR-03〜05 で解消した。
- Iteration 2 の複数ファイル atomic write 指摘は、単一 filesystem atomic write 要求を削除し、workspace lock、永続 transaction journal、reader 前 recovery の検証可能な契約へ置換した。
- operation ID は tool が journal 作成時に一度生成し、未完了 journal の recovery で再利用する。caller 指定は不要とし、失敗境界ごとの期待 bytes と重複件数を NFR-01 に定義した。

## Review — Iteration 1

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T06:50:07Z
- **Iteration:** 1
- **Scope decision:** none

診断要件と原子性の合否条件に、QAが一意に検証できない曖昧さが残る。

### Findings

- BLOCKER NFR-02/FR-03: 対象不在時には現在statusがないため診断要件が矛盾する。
- BLOCKER FR-03/NFR-01: 原子性の観測境界、並行保証、失敗点ごとのrollback対象が未定義。
- MAJOR FR-03/FR-04: HUMAN_TURN承認証跡の必須フィールド、対応キー、重複判定キーが未定義。
- MAJOR FR-05: selector入力形態の受入試験母集団が不明確。

## Review — Iteration 2

- **Verdict:** NOT-READY
- **Reviewer:** amadeus-product-lead-agent
- **Date:** 2026-07-23T06:52:06Z
- **Iteration:** 2
- **Scope decision:** none

診断、HUMAN_TURN証跡、selector母集団は解消したが、複数ファイルatomic writeとoperation ID再利用契約が未確定。

### Findings

- BLOCKER NFR-01: 独立ファイルのregistryとcursorを単一atomic writeする条件は現行構造と両立しない。
- MAJOR FR-03/FR-04/NFR-01: operation IDの生成主体と再試行時の再利用契約が未定義。
- RESOLVED NFR-02: 対象不在時の診断契約を分離した。
- RESOLVED FR-03/FR-04: HUMAN_TURN証跡をテスト可能にした。
- RESOLVED FR-05: selector母集団をchokepointとcaller corpusで閉じた。
