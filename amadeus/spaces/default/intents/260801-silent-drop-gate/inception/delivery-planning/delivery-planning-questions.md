# Delivery Planning — Questions

> 上流入力（consumes 全数）: `requirements.md`、`components.md`、`unit-of-work.md`、`unit-of-work-dependency.md`、`unit-of-work-story-map.md`、`team-practices.md`。User Stories／Refined Mockups／Team Formation は scope 上 SKIP のため、SC-01〜SC-07 と直接 FR-12 acceptance を利用者価値の追跡単位とし、全 Bolt は `amadeus-developer-agent` が担当する。
>
> ユーザー承認: 2026-08-02T04:08:30Z（4 Bolt／3 batch の Delivery Plan を承認）

## Interaction Mode

配送戦略と4 Boltの完了契約を、どの方法で回答しますか。

- A. Guide me（推奨）— 推奨案と根拠を示し、一問ずつ短く確認する
- B. Grill me — 経済的順序、失敗条件、代替案を一問ずつ深掘りする
- C. I'll edit the file — この質問ファイルをユーザーが直接編集する
- D. Chat — 自由に議論し、会話から決定事項を抽出する
- X. Other (please specify)

[Answer]: A — Guide me（2026-08-02T03:56:55Z、ユーザー回答「1」）

## Q1. Sequencing heuristic

4 Unit の経済的順序を、どの原則で決めますか。

- A. hybrid: walking-skeleton-first の後に risk-first／WSJF（推奨）— 新しい検証経路を U1 で端から端まで先に実証し、独立な U2／U3 はリスクと規模で扱い、全成果を消費する U4 を最後に統合する
- B. risk-first のみ — 最も不確実な Unit から順に進める
- C. value-first のみ — 利用者に見える改善価値の高い Unit から進める
- D. WSJF のみ — 全 Bolt を同じ数式で順位付けする
- E. topology-only — 経済判断をせず有効な topological order を一つ選ぶ
- X. Other (please specify)

[Answer]: A — hybrid: walking-skeleton-first の後に risk-first／WSJF（2026-08-02T03:58:48Z、Guide me、ユーザー回答「1」）

## Q2. WSJF scoring

walking skeleton 後の候補比較に、どの scoring を使いますか。

- A. lightweight WSJF（推奨）— `(利用者・事業価値 + 時間的緊急性 + リスク低減価値) ÷ job size` を各1〜5の等重みで採点し、同点は failure impact が高い方を優先する
- B. risk-reduction を2倍にした WSJF — 不確実性を強く優先する
- C. value を2倍にした WSJF — 直接利用者価値を強く優先する
- D. WSJF は使わず定性的 risk-first だけで説明する
- E. 固定順序だけを記録し、score は付けない
- X. Other (please specify)

[Answer]: A — lightweight WSJF、価値／緊急性／リスク低減を等重み（2026-08-02T03:59:11Z、Guide me、ユーザー回答「1」）

## Q3. Bolt granularity と Unit 対応

Unit を Bolt にどう割り当てますか。

- A. 1 Unit = 1 Bolt の4 Bolt（推奨）— team.md の「複数ユニットを単一 PR に束ねない」と org.md の Bolt→スカッシュコミット 1:1 に適合する。Bolt 1=`static-gate-engine`、Bolt 2=`mirror-persistence-propagation`、Bolt 3=`text-mutation-loud-failure`、Bolt 4=`repository-adoption`。既に確定した独立 acceptance／単一 writer をそのままレビュー境界にし、U2／U3 の並列性を保持する
- B. 3 Bolt — U2／U3 を一つの runtime loud-failure Bolt に束ねる。レビュー回数は減るが team.md の複数 Unit 非束縛ノルムからの明示逸脱になる
- C. 2 Bolt — U1〜U3 を foundation、U4 を adoption とする。独立 acceptance と U2／U3 の並列性を失い、ノルム逸脱になる
- D. 1 Bolt — 4 Unit を一括実装する。walking-skeleton gate と Unit 単位レビューの実効性を失うためノルム逸脱になる
- E. thin slice で同じ Unit を複数 Bolt に分割する。Unit の独立完了境界を再設計する必要がある
- X. Other (please specify)

[Answer]: A — 1 Unit = 1 Bolt の4 Bolt（2026-08-02T04:01:36Z、Guide me、ユーザー回答「1」。team／org ノルムと構造上の有効性を確認後に確定）

## Q4. Parallel execution

依存のない Bolt をどう実行しますか。

- A. Bolt 1 を単独で walking-skeleton gate、その後 Bolt 2／3 を並列 batch、Bolt 4 を単独（推奨）— `{U2,U3}` の非依存性を使い、U4 は U1／U2／U3 完了後に開始する
- B. 4 Bolt をすべて直列にする
- C. U1／U2／U3 を最初から並列にし、U4 だけ後段にする
- D. 全 Bolt を並列にする
- E. Construction 開始時に決め、計画では未確定にする
- X. Other (please specify)

[Answer]: A — Bolt 1 単独、Bolt 2／3 並列 batch、Bolt 4 単独（2026-08-02T04:02:40Z、Guide me、ユーザー回答「1」）

## Q5. External dependencies と gated items

外部依存をどう扱いますか。

- A. 外部依存0件（推奨）— 新規 API／データ窓／外部チーム／資格情報はない。Git base SHA、GitHub Actions、分類・承認 receipt、人間 gate は repository 内の実行前提／内部 gated item として別記する
- B. GitHub Actions と Git history を外部依存として扱う
- C. 人間の evidence approval を外部チーム依存として扱う
- D. ast-grep を外部サービス依存として扱う
- E. 未確定として Construction まで保留する
- X. Other (please specify)

[Answer]: A — 外部依存0件、repository 内前提／内部 gated item は別記（2026-08-02T04:05:25Z、Guide me、ユーザー回答「1」）

## Q6. Earliest risk focus

最初に潰す最大リスクはどれですか。

- A. U1 の完全走査＋semantic classifier＋trusted-base ratchet（推奨）— gate が漏れ、誤検知、ledger 同数置換、内部異常の green 化を同時に防げるかを最初に実証する
- B. U3 の commit 境界と outbox 収束
- C. U2 の全 text mutation caller 移行
- D. U4 の CI／distribution drift
- E. 4リスクを同順位にする
- X. Other (please specify)

[Answer]: A — U1 の完全走査＋semantic classifier＋trusted-base ratchet（2026-08-02T04:05:48Z、Guide me、ユーザー回答「1」）

## Q7. Bolt 1 — static-gate-engine

Bolt 1 の完了契約をどれにしますか。

- A. gate core の walking skeleton（推奨）— U1 を含み、manifest→snapshot→ast-grep→TypeScript semantic→policy／ratchet→CLI exit と root script を実 source／fixture で通す。DoD は NSD001〜003 positive／negative、Pass／Violation／Error exit、determinism、15秒前提、lockfile 固定。仮説は「hybrid detector が漏れず fail-closed に短時間実行できる」。demo は違反 exit 1、基盤異常 exit 2、正常 exit 0
- B. structural scan だけを完成させ semantic／ratchet は後続へ送る
- C. CLI schema だけを先に作り detector は後続へ送る
- D. U4 の CI wiring まで Bolt 1 に混在させる
- E. walking skeleton とせず通常 Bolt にする
- X. Other (please specify)

[Answer]: A — gate core の walking skeleton（2026-08-02T04:06:15Z、Guide me、ユーザー回答「1」）

## Q8. Bolt 2 — mirror-persistence-propagation

Bolt 2 の完了契約をどれにしますか。

- A. commit boundary の loud propagation（推奨）— U3 を含み、pre-commit bytes不変、directory fsync=`durability-unknown`、post-commit=`outbox-pending`、冪等 drain 収束を failure injection で実証する。仮説は「既存 outcome のまま偽 `safety-blocked` success を排除できる」。demo は各注入点の typed outcome と bytes／収束差分
- B. `persistBlocked` の戻り値検査だけに限定する
- C. 新しい全域 Result 型まで導入する
- D. outbox の再設計を含める
- E. U4 に吸収する
- X. Other (please specify)

[Answer]: A — commit boundary の loud propagation（2026-08-02T04:06:44Z、Guide me、ユーザー回答「1」）

## Q9. Bolt 3 — text-mutation-loud-failure

Bolt 3 の完了契約をどれにしますか。

- A. 全 caller の write-before-success（推奨）— U2 を含み、validated state、`changed | not-found`、postcondition 再parse、jump／utility／state／Bolt merge の全 caller を移行し、not-found／malformed／duplicate／idempotent を検証する。仮説は「局所 typed result だけで silent no-op を互換性を壊さず除去できる」。demo は対象不在で typed failure かつ state／audit bytes 不変
- B. helper だけを変更し caller 移行は後続へ送る
- C. not-found を warning success にする
- D. 自動 retry／resync を追加する
- E. U3 と同じ Bolt に束ねる
- X. Other (please specify)

[Answer]: A — 全 caller の write-before-success（2026-08-02T04:07:09Z、Guide me、ユーザー回答「1」）

## Q10. Bolt 4 — repository-adoption

Bolt 4 の完了契約をどれにしますか。

- A. repository-wide adoption（推奨）— U4 を含み、承認済み pre／post evidence、`B0 ⊂ B_pre`、#1874／#1878 identity 削除、FR-12 t407／t411、base SHA 供給、blocking lint step、cold／warm各5試行、FP≤5%、package／promotion drift を統合する。仮説は「正本 ledger と CI／配布が detector と runtime fixes を無音退行なしで固定できる」。demo は local／CI 同一 exit と全 drift guard green
- B. CI wiring だけに限定し evidence／baseline は別作業にする
- C. corpus evidence だけに限定し CI／配布を別作業にする
- D. 新規 CI job／deployment pipeline を追加する
- E. baseline または exemption の基準を緩和する
- X. Other (please specify)

[Answer]: A — repository-wide adoption（2026-08-02T04:07:43Z、Guide me、ユーザー回答「全部推奨で」）

## Ambiguity Analysis

- 曖昧語: 0件。4 Bolt、3 batch、WSJF式、外部依存0件、各DoD／confidence hypothesis／demoを具体化した。
- 回答間の矛盾: 0件。U4 は U1／U2／U3 完了後、U2／U3 だけが同一 parallel batch であり、DAGを満たす。
- walking skeleton: U1 は C1〜C6、root script、U4向けversioned contract fixtureまでを通して主静的ゲート経路の全integration seamを実証する。U2／U3の実装やU4の正本値／CI wiringは所有せず、後続Boltで完成させる。
- team allocation: Team Formation はSKIPのため、全Boltを `amadeus-developer-agent` が担当する。並列batchではUnitごとに隔離worktreeを使う。
- 外部依存: 0件。Git base SHA、evidence approval、人間gate、CI、package／promotion driftは内部gated itemとして所有者・解除条件を記録する。

## Delivery Plan Approval

全回答の統合要約を確認後、4成果物と Inception phase check を生成する。

- A. Approve Plan（推奨）— 配送計画成果物を生成する
- B. Revise Plan — 修正対象と内容を指定する
- X. Other (please specify)

[Answer]: A — Approve Plan（2026-08-02T04:08:30Z、Guide me、ユーザー回答「1」）
