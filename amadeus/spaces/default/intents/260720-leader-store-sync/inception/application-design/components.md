# Components — 260720-leader-store-sync(#1281)

上流入力(consumes 全数): requirements, intent-statement, scope-document, architecture, code-structure, component-inventory, team-practices — 分割は requirements.md の FR-1=C、architecture.md の同定節、code-structure.md の scripts/ 層、component-inventory.md の既存 CLI ツール台帳(重複新設の回避確認)、team-practices.md の live 参照(mirror idiom・2層テスト)に依拠

## 構成(単一 tool `scripts/amadeus-leader-sync.ts`+ノルム面)

FR-1=C(併用)に従い、実装は repo ローカル tool 1本+norm persist(B-3、leader 実行)で構成する。tool 内部は判別ユニオン Result の純関数層と、port 境界(GitRunner/GhRunner)の副作用層に分離(functional-domain-modeling-ts)。

| # | コンポーネント | 責務 | 規模見積(行) |
| --- | --- | --- | --- |
| C1 | OwnedSetResolver | leader 所有物の決定的抽出述語 — **2クラス限定(ADR-3)**: elections/ 全量+自クローンシャード(`shardBasename` 合成規則の自己完結実装 — packages/ へ依存しない)。norm 差分は抽出対象外(計測のみ C5、運搬は既存 norm PR 経路)。memory 層は常に対象外(E-PM10A) | 80 |
| C2 | ExclusionGuard | E-PM10A 述語: 生成ブランチ上の「自所有物外 M ファイル」全数を origin/main と突き合わせ、memory 層は main 版へ強制復元、メンバー intent snapshot の混入を拒否(fail-closed) | 90 |
| C3 | SelfCheck | 純追加性(所有物外の削除・改変 0)/ JSON parse 全数 / マーカー正準3語彙(grep -cE 相当を in-process 実装、E-PM10B 準拠)— 検査結果の構造化レポート | 70 |
| C4 | PrComposer | origin/main 起点の単独ブランチ生成(`sync/leader-<UTCdate>-<seq>`)→ commit → GhRunner 経由 `gh pr create`(PR 作成まで。auto-merge 不採用 = ci.yml precedent との意図的相違、C-4) | 90 |
| C5 | StatusProbe | 未同期選挙数・シャード差分行数・**norm 差分行数(memory 層の origin/main 比 — 計測・警告表示のみ、運搬は norm PR 経路 = ADR-3)** の計測(`status` verb — FR-2 二重契機の N 超過判定を leader に提供。閾値 named constant `SYNC_ELECTION_THRESHOLD` の定義所在) | 60 |
| C6 | CLI shell | verb dispatch(`status` / `plan` / `create`)・args parse(判別ユニオン)・exit 契約 0/1/2(mirror.ts idiom) | 60 |

合計見積: 実装 ~450行(80+90+70+90+60+60 — C5 増分反映の機械再計算)+テスト ~300行(t232 帯2層様式)。規模バジェット逸脱なし(単一 Bolt 想定)。

## Reuse Inventory(inception ガードレール)

- **流用**: `GhRunner`/`spawnGh` 様式(`scripts/amadeus-mirror.ts` — port 注入のテストシーム込み)、tmp+rename アトミック書込様式(election-store)、t232 帯テスト様式。branch 命名は ci.yml:319-327 precedent の類推形(`sync/leader-…`)。
- **新設根拠**: PR 生成の scripts/ 面前例は不在(ci.yml は CI shell ステップで tool 化されていない)— 既存で代替不能。
- **非導入**: engine 変更・election CLI 変更・配布面追加(W-1〜W-3)。adapter/外部契約の先行着地なし(全コンポーネントは本 intent 内で配線完結 — N3 遵守)。
