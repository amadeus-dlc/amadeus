# Intent Statement — Amadeus の長時間実行を全ハーネスで有界・計測可能にする（Codex 一次評価）

## Problem Statement

Amadeus の長時間化は Codex で強く観測されているが、対象4 Issue が示す問題は Codex 固有の遅さだけではない。実行由来情報、停止上限、質問・レビュー反復、swarm の同時実行数・再試行数について、共有 core が保証すべき不変条件と、各 harness がそれを実証する adapter 契約が統一されていない。そのため、完了時刻を予測できず、異常な長時間実行を安全に終端できない。

利用者にとっての問題は単なる「Codex が遅い」ことではない。どの harness でも、正常な長時間処理と停止性の欠陥を区別できず、待つ・中止する・原因を修正する判断に必要な共通証拠が不足していることである。Codex はこの問題を一次観測し、改善効果を dogfood する対象であって、別の安全ポリシーを持つ対象ではない。

## Target Customer

正しさと停止性の一次対象は、影響を受ける全 supported harness 上で Amadeus workflow を実行するユーザーと、共有 core および各 harness adapter を保守するコントリビューターである。Codex ユーザーは、長時間化の性能測定と dogfood における一次評価対象である。

- 全 harness のユーザーは、現在位置、時間の支配要因、停止または継続の根拠を、同じ終了理由と予算語彙で知りたい。
- core／adapter のコントリビューターは、長時間化を再現可能な計測値へ分解し、共有不変条件が各 harness 投影で保たれることを検証したい。
- Codex ユーザーと Codex harness 保守者は、同じ正しさの契約に加え、一次 workload による改善前後の性能差を確認したい。全 harness で同率の時間短縮を達成することは要求しない。

## Success Metrics

成功は、#1602 で取得する実測ベースラインと、後続 Bolt ごとの同一条件による対照／処置比較で判定する。Ideation では根拠のない絶対時間を固定せず、数値目標と測定手順はベースライン取得後の NFR で確定する。

最低限、次をすべて満たす。

### 共有の正しさ・安全性

1. stage・agent・tool の実行由来情報について共有 schema を定義し、取得可能な値または「取得不能」の明示状態を、state・audit・runtime graph で相関できる。
2. 停止予算は、同一 stage の非遷移イベント追加では減算・累積が巻き戻らない単調な契約とする。Issue #1998 の起票時再現を再適用し、上限回避がゼロであることを確認する。
3. 質問とレビューの反復は明示された共有予算内で必ず終了し、終了理由を harness に依存しない語彙で識別できる。
4. swarm の同時実行数と同一 Unit の再試行数は、確定した共有上限を超えない。
5. 共有 core の単一 conformance predicate と、影響を受ける全 supported harness の package／self-install 投影および adapter conformance が同じ不変条件を検証する。harness が取得できない情報は capability として明示し、無証拠の成功扱いにしない。

### Codex による一次性能評価

6. #1998、#1999、#1919 の各 Bolt は、#1602 で取得する Codex のベースラインと比較可能な同一 workload で、処置後の時間・反復回数・終端結果を報告する。
7. 全 supported harness に同じ性能改善率を要求しない。ただし、共通の正しさ・安全性契約を免除する根拠にはしない。

Codex 専用の blocking gate を追加できるのは、Codex にしかない native lifecycle／hook 意味論を共有 predicate へ写像できず、共通 conformance では欠陥を検出不能であることを再現可能な証拠で示した場合に限る。現時点の4 Issueには、その例外を正当化する証拠はない。

## Initiative Trigger

ユーザーが Codex の作業はかなり長くなる傾向が強いと継続的に観測し、関連する4件の Issue が個別に存在していることが契機である。

- #1602: 実行由来情報と処理時間の記録
- #1998: Stop hook と swarm の上限回避・停止性
- #1999: 質問・レビュー契約と予算
- #1919: 有界な swarm Unit pool

Issue #1998 は、固定 SHA `d72f60b5a81fc6e45f99431d61b6561e91b2fc37` に対する起票者以外2名の独立クロスレビューで `ESTABLISHED_WITH_REFINEMENTS` が成立している。これにより、少なくとも停止性の問題は推測ではなく、現行コードと再現結果に接地している。

## Initial Scope Signal

本取り組みは、既存の Amadeus に計測・停止性・予算・有界実行の新しい契約を加える brownfield の `self-feature` である。論理的に1つの改善ループであるため1 Intent にまとめ、1 Issue を 1 Bolt として次の依存順で実施する。

1. #1602 で比較可能なベースラインを作る。
2. #1998 で停止上限の回避を閉じる。
3. #1999 で質問・レビュー反復を予算化する。
4. #1919 で swarm の並列数と再試行を有界化する。

各 Bolt の着地後に後続 worktree を最新 base へ rebase し、前段の改善を後段の実装と検証へ波及させる。package/promote 検証後は Intent を park し、新しい Codex セッションで resume して、更新された prompt・hook・配布面を後続作業自体へ適用する。

品質境界は次の三層で統一する。

1. 共有 core が、計測・停止・反復予算・並列上限の決定的な不変条件と終了理由を所有する。
2. 影響を受ける各 harness の package／self-install 投影と adapter conformance を、同じ合否規則へ接続する。
3. 実モデル journey は harness ごとの driver と capability に応じて実証する。Codex は一次 dogfood 対象だが、その live probe は別ポリシーゲートではない。

全 harness で同じ時間改善量を証明することは本 Intent の完了条件に含めない。一方、共有不変条件と adapter の証拠は harness 間で統一的に扱う。

## Initial Boundaries

- 着手する Issue だけへ `in-progress` を付与し、完了時に除去する。現在の着手対象は #1602 だけである。
- 実装方式、時間予算、反復上限、並列上限の具体値は、既存定数と #1602 の実測を踏まえて後続ステージで決める。
- Codex 固有の adapter test／live probe は許容するが、再現可能な例外根拠なしに Codex 専用の安全ポリシーまたは blocking gate を作らない。
- 無関係な runtime 最適化、全ハーネス同率の性能改善、Codex 製品本体の変更は対象外とする。

## Reference Evidence for Downstream Analysis

[Issue #1998 の takt 比較コメント](https://github.com/amadeus-dlc/amadeus/issues/1998#issuecomment-5154591557)を、後続ステージの調査入力として扱う。コメントは、takt のループ制御を次の二層として整理している。

1. ステップ同一性だけを数える決定的ガード。副次活動を進捗シグネチャへ混ぜないため、監査行追加のようなノイズで連続回数をリセットできない。
2. 所見の減少や同じ修正の反復を評価する意味論的な収束判定。決定的上限では判別できない非生産的な小ループを検出し、再計画または人間判断へ戻す。

本 Intent では、このコメントを採用済み設計とはみなさない。Feasibility と Reverse Engineering で takt の一次ソースおよび Amadeus の現行機序を再確認し、Requirements では決定的な累積上限と swarm ハードキャップを主契約、意味論判定を補助的な再計画情報の候補として評価する。LLM 判定だけで停止性を保証したり、決定的ガードを置き換えたりしない。
