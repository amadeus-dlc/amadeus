# Depth 制御アーキテクチャ

> 言語: [English](25-depth-control-architecture.md) | **日本語**

Depth 制御 — ステージの産出量を現在の depth レベルへ合わせて調整する機構
([Stage Protocol](04-stage-protocol.ja.md) §8)— は、ワークフローのライフサイクル
全体にわたる複数の独立した制御点で実装されています。各制御点はそれぞれ別の
スケジュールで強化されてきましたが、ある制御点での局所最適が全体として釣り合いの
取れた制御系を保証するわけではありません。ある層が効果に対して過剰に縛られる
(小さな産出源に最も固いゲートが乗り、最大の産出源が無制御のまま走る)、あるいは
過少に縛られる(センサーの裏付けを持たない契約だけがある)ことが、単に「そこが
最も着手しやすかった」という理由だけで起こり得ます。

**本章を裁定する正本は
[Issue #2683](https://github.com/amadeus-dlc/amadeus/issues/2683)** です。
制御点マップ、層別の目標強制度、blocking 化の総量規制原則、そして下記の着手順を
固定したバランス裁定です。本章はその確定裁定の転記であり、第二の正本では
ありません。ここに記す数値と原則は裁定コメント
([issuecomment-5229552315](https://github.com/amadeus-dlc/amadeus/issues/2683#issuecomment-5229552315))
から逐語で転記したものであり、再導出したものではありません。本章と Issue
スレッドが食い違う場合は Issue スレッドを正とし、その食い違いを解消する変更と
同じ変更で本章を是正します。

## 運用規範

**新しい depth 系強化は、着手前に本マップ上の位置と目標強度を宣言します。**
どの行を強化するのかを明示せず、かつその強化後の強度が下記の裁定を超えないかを
確認せずに強制を追加する提案は、本章がまさに防ごうとしている局所最適の変更その
ものです。

## 制御点マップ(L0〜L5)

2026-08-09 時点で実測したワークフロー全体の制御点の全数:

| 層 | 対象 | 測定 | 強制度 | 状態 |
|---|---|---|---|---|
| L0 ステージ SKIP | scope grid / composer | —(実行有無そのもの) | **機械強制**(engine が directive を発行しない) | 稼働中 |
| L1 early sizing | intent サイズ × depth の整合(intent-capture / scope-definition ゲート) | **なし** | **なし** | 空白 |
| L2 質問上限 | 全ステージの主要質問数(4/8/12) | **なし**(数えるセンサー不在) | 契約のみ([#2672](https://github.com/amadeus-dlc/amadeus/issues/2672) で MUST 化) | 契約化済み・未測定 |
| L3 FR 分量 | `requirements.md` の FR 数帯・bytes/FR | `depth-budget` センサー([#2503](https://github.com/amadeus-dlc/amadeus/issues/2503) / [#2673](https://github.com/amadeus-dlc/amadeus/issues/2673))+ census([#2666](https://github.com/amadeus-dlc/amadeus/issues/2666)) | 契約([#2672](https://github.com/amadeus-dlc/amadeus/issues/2672))+ advisory | 最も固い |
| L3' NFR 分量・被覆 | nfr-requirements / nfr-design(バイト3位+6位、計 5.0MB) | **なし**(ID 契約も無し) | **なし**(`directive.depth` 未接続) | 空白(子 Issue 起草中) |
| L4 設計成果物 | application-design / functional-design の定性形 | なし(検証不能な定性のため意図的に guidance) | guidance([#2672](https://github.com/amadeus-dlc/amadeus/issues/2672) で契約と分離) | 裁定済み |
| L5 強制の受け皿 | sensor severity `blocking` + approve 経路の消費者 | —(機構) | fail-closed(実装中、[#2671](https://github.com/amadeus-dlc/amadeus/issues/2671) (c)) | 実装中・本番適用ゼロ |

バイト分布と L3/L3' の順位の出典: 全30ステージ slug を対象としたステージ成果物
バイト census(上位7ステージで全体の80.0%)、
[#2671 issuecomment-5229507166](https://github.com/amadeus-dlc/amadeus/issues/2671#issuecomment-5229507166)。

## 層別の目標強制度

裁定は各層について、上記のバイト分布と各行に引用した advisory precision の
実測証拠から、5段階の強度 — **機械強制 / 契約+測定 / 契約のみ / guidance /
制御しない** — のいずれか1つを固定しました。

| 層 | 裁定 | 根拠 |
|---|---|---|
| L0 SKIP | **機械強制(現状維持)** | 稼働中・問題なし。 |
| L1 early sizing | **新設する(着手順は最後発)。** まず測定可能な述語の設計から始める。強度は測定実績が出るまで advisory 上限のまま。 | 述語が存在しないまま契約を先に書くと、測定なき契約をもう一つ増やすことになる — L2 と同じ轍。 |
| L2 質問上限 | **測定に載せる。** 質問数センサー(questions ファイルの機械カウント vs 4/8/12)を新設し、advisory で開始する。 | 上限は既に契約化されている([#2672](https://github.com/amadeus-dlc/amadeus/issues/2672))のに未測定 — FR 側で確立した「測定なき契約は検証劇場に近づく」という原則への恒常的な違反状態。 |
| L3 FR 分量 | **現状維持**(契約+advisory+census)。blocking 化は [#2553](https://github.com/amadeus-dlc/amadeus/issues/2553) と下記の総量規制原則という二重ゲートに従う。 | 着地済み。 |
| L3' NFR | **梯子を最初から登る**: ID 契約 → 測定 → 観測レンジ → 閾値 → 契約。閾値以降の作業は観測分布が出るまで着手しない。 | `cid:code-generation:c1-threshold-inside-observed-range`(`amadeus/spaces/default/memory/project.md`): 検査対象の観測レンジの外側に置かれた閾値は、常時赤または常時緑の判定へ退化し、測定ではなくなる。 |
| L4 設計成果物 | **guidance 確定。** この層に対する [#2672](https://github.com/amadeus-dlc/amadeus/issues/2672) の裁定を、マップ全体の恒久裁定へ昇格する。 | 検証不能な定性形を MUST 化することは検証劇場である。 |
| L5 受け皿 | **fail-closed で実装続行**([#2671](https://github.com/amadeus-dlc/amadeus/issues/2671) (c))。本番適用は下記の blocking 化総量規制に従属する。 | 実装中。 |

## blocking 化の総量規制(原則)

L5 の受け皿が完成すると、各面が独自に advisory の判定を `blocking` severity へ
独立に変換できるようになります。総量規制なしにその独立性を許すと、局所的な判断の
積み重ねがワークフロー全体を恒常的な停止へ押しやります。裁定は、どの面(現行・
将来を問わず)でも blocking 化が満たすべき3原則を固定しました:

1. **precision ゲート**: 実運用から測定した当該面の advisory flag 率が
   **10〜30%** 帯([#2553](https://github.com/amadeus-dlc/amadeus/issues/2553)
   完了条件3と同じ、外れ値検出として機能する帯)に収まるまで、その面を
   `blocking` へ変換しない。帯の下側では検査が捕捉できている量が blocking 化を
   正当化するには不十分であり、帯の上側では外れ値でなく通常のケースを
   フラグしていることになる。
2. **総量上限**: 同時に `blocking` な面は当面**2面まで**。上限の引き上げには
   [Issue #2683](https://github.com/amadeus-dlc/amadeus/issues/2683) への
   コメントとして記録される追記裁定が必要。
3. **記録義務**: 各面の blocking 化は
   [Issue #2683](https://github.com/amadeus-dlc/amadeus/issues/2683) への
   コメントとして宣言し、実測した precision の値を添える
   (`cid:requirements-analysis:numbers-from-command-output-only` に従い —
   記録する数値はコマンド出力に由来するものとし、記憶や見込みで書かない)。

## 着手順

上記の空白・無制御の層(L1、L2、L3')をそれぞれの裁定済み強度まで引き上げる
順序は、都合で選んだものではなく導出されたものです:

**L3'(NFR 基盤)→ L2(質問数センサー)→ L1(early sizing)**

導出根拠: バイト分布 × 現行強度と裁定強度のギャップ。出典は上記と同じ全数
census
([#2671 issuecomment-5229507166](https://github.com/amadeus-dlc/amadeus/issues/2671#issuecomment-5229507166))。
L3' は未測定のバイト量が最大(5.0MB、バイト3位+6位の産出源)であるのに強制度
ゼロ — 最も大きなギャップです。L2 は既に契約があるのにその裏付けとなる測定が
ゼロ — このギャップを次に埋めます。L1 は既存契約を持たない新設層であるため
着手順は最後発です。まず述語を設計してから(上記 L1 の裁定どおり)着手すること
で、L2 と同じ「測定なき契約」の過ちを繰り返しません。

## 子 Issue の従属付け

以下の各子 Issue が上表のいずれか1つ以上の行の実装を担当します。各子 Issue の
裁定は本マップと矛盾してはならず、その確認は各子 Issue の Pull Request における
必須レビュー観点です:

- [#2425](https://github.com/amadeus-dlc/amadeus/issues/2425) — 効果実測(L3)
- [#2553](https://github.com/amadeus-dlc/amadeus/issues/2553) — 閾値再調整(L3)
- [#2671](https://github.com/amadeus-dlc/amadeus/issues/2671) — §8 規範性 +
  severity 機構(L2〜L5)
- NFR 基盤 enhancement(L3'、本裁定時点で起草中 — 起票され次第リンクを追加)
- L1 early sizing(未起票 — 上記 L2 測定作業が述語設計のパターンを確立した後に
  起票)
- [#2661](https://github.com/amadeus-dlc/amadeus/issues/2661) — 親トラッキング
  Issue(depth 完遂 + 検証スイープ)。本章を裁定する
  [#2683](https://github.com/amadeus-dlc/amadeus/issues/2683) は #2661 の子。

## 関連

- [Stage Protocol §8, Depth Guidance](04-stage-protocol.ja.md) — 本マップの
  L2〜L4 行が強制または指針とする、depth レベル契約(質問上限・FR 帯)と
  guidance(定性形)。
- [Sensor System](07-sensor-system.ja.md) — L3 が使う `depth-budget` センサーと、
  L5 が統治する severity 機構(`advisory` / `blocking`)。
