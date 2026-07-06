# Business Rules — u001-installer-versioning（260706-installer-versioning）

上流入力: [requirements.md](../../../inception/requirements-analysis/requirements.md)、[business-logic-model.md](business-logic-model.md)、application-design の [decisions.md](../../../inception/application-design/decisions.md)

| ID | 規則 | 由来 |
|---|---|---|
| BR-1 | すべてのコピー対象書き込みは trackedWrite を通す（直接の writeFileSync / cpSync を残さない） | AD-2 |
| BR-2 | 判定（judge）は純関数に閉じ、eval が判定表の全行を表引きで検証する | AD-3 |
| BR-3 | manifest は成功時のみ・main 末尾で 1 回書き出す（runStep / smoke いずれの失敗でも書かない） | FR-1.3、interaction-spec |
| BR-4 | 退避はヘッダ件数 = 列挙行数 = 退避総数。廃止分は内数行。無言の退避・削除・再作成をしない | FR-2.3、集計ルール |
| BR-5 | B001 は出力・挙動とも従来互換（判定固定）。既存 271 assertion の全 GREEN を gate 条件に含める | bolt-plan（構造変更の分離検証） |
| BR-6 | eval assertion は実装前に追加し RED を確認する。中断時は遡及 RED 検証 | dev-scripts TDD 規約、learnings c6 |
| BR-7 | 変更対象は scripts/amadeus-install.ts、dev-scripts/evals/installer/check.ts、README 英日に閉じる。skills/ に触れる場合は leader へ一報 | requirements 制約、#572 |
| BR-8 | amadeus/ 配下・walking skeleton の個別確認・非対話・冪等の各制約（C-1〜C-4）を破らない | constraint-register |
| BR-9 | B001 の Bolt gate は人間の個別確認（auto 委任の例外）。到達時に leader へ報告 | delivery-planning 承認の注意 |
| BR-10 | scripts/amadeus-install.ts へ新規に打つ規則コメントは、既存 Intent（260705-engine-installer）の BR-1〜15 コメントと数字が衝突するため、`BR(#543)-n` 形式で Intent を併記する。既存 BR-n コメントは書き換えない | §12a 反復 1 指摘 7（名前空間衝突の回避） |
