# Phase Check — Construction（260706-doctor-guidance）

対象 phase: Construction（bugfix scope、実行ステージは code-generation / build-and-test。unit: doctor-guidance）
検査日: 2026-07-06

## トレーサビリティ

| 連鎖 | 状態 |
|---|---|
| FR-1（doctor 3 分岐化） → code-generation（commit 1ece633d） → installer eval GREEN（正順 RED 7 FAIL 先行 + birth 後 3 検査の回帰ガード） | Fully traced |
| FR-2（installer info 化） → code-generation（1ece633d） → installer eval の info 行検査 GREEN | Fully traced |
| FR-3（eval 精密化 2 件 = 破損状態の .claude+.agents 削除、dist/ assertion の行限定） → 8d7f1020 + diary 記録 | Fully traced |
| FR-4（parity reason entry） → parity-map 追記 → parity:check ok | Fully traced |
| reviewer（READY、M1/L2） → Low 2 即修正、Medium は挙動 eval の drift 検出を裏取りして反証記録 | Fully traced |
| build-and-test fresh 検証（2026-07-06T08:50:06Z 全 pass） → AC 表 | Fully traced |

## カバレッジ

- AC 4 行すべて実測 GREEN（AC-1 導入直後 doctor exit 0 + advisory + dist/ なし、AC-2 installer info + 破損時の実行可能 fix、AC-3 一連の eval 検証 = RED 先行つき、AC-4 parity ok + test:all + validator + sensor 対応の consumes 段落）。

## 整合性検査

- Per unit は実 unit 名 doctor-guidance へ record 整合済み。
- marker 契約（utility ⇄ installer）は挙動 eval が片側 drift を検出することを実測裏取り済み（diary 反証記録）。

## 警告

- doctor の他検査行（settings.json 等）の fix に残る dist/ 文言は #573 スコープ外の後続 Issue 候補（gate 報告で申し送り済み）。

## 人間承認

- [x] code-generation の gate を人間が承認した（auto 委任、leader 内容確認 2026-07-06 17:52 JST、HUMAN_TURN mint・DECISION_RECORDED 転記済み）。
- [x] build-and-test の gate を人間が承認した（auto 委任、leader 内容確認 2026-07-06 18:00 JST、HUMAN_TURN mint・DECISION_RECORDED 転記済み → 本 report で転記）。
