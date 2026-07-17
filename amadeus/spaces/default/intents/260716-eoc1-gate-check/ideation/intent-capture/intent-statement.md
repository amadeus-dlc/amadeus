# Intent Statement — eoc1-gate-check(Issue #1101)

上流入力(consumes 全数): Issue #1101(起票 leader、クロスレビュー e2+e4 成立・e3 検査案提供 — 含意形述語へ収束)、E-PM6 L1 裁定(cid:requirements-analysis:eoc1-evidence-in-questions-header — #1102 で main 着地)、#922(同族 enhancement — 先記入ヒヤリハット4例台帳)、leader 割当指示(feature スコープ・落ちる実証必須・逸脱実装前停止)。

## 解決する問題

E-OC1(選挙不要判定の3段順序: 申告→leader 承認→[Answer] 記入)の順序 slip が同日2例(e3/e1、自己捕捉)+同族の先記入ヒヤリハット4例(#922)— 手順ノルム(prose)は LLM 自己規律のみで構造的再発防止にならない。裁定 E-PM6 L1 により機械検査を導入する(prose→機械化は #1080/#1100 と同じ「機械化」行き先の実践)。

## 実現する価値

- gate-start 時点で「承認証跡なき [Answer] 記入」を fail-closed 拒否 — 先記入クラスの構造的封鎖
- 検査述語は含意形([Answer] 非空 ⇒ 裁定参照 or 承認タイムスタンプ行実在)— 正常フロー(裁定後記入)を偽陽性拒否しない(クロスレビュー3名収束)
- 落ちる実証3系(拒否2+正常系非拒否1)で偽陽性・偽陰性の両側を固定

## 非目標

- #922 の advisory sensor 化そのもの(検査ロジック共有の可否は requirements で判断 — 採らない場合 #922 は別 intent)
- E-OC1 手順ノルム自体の改定(検査は既決ノルムの執行機構)
