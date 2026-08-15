# Scope Document — intent 260815-rfc-autonomy-modes

> 上流: RFC-0001(approved)。境界は RFC が確定済み(全能力 SETTLED)— 本書は転記と整理であり再裁定しない。

## 能力目録(全 SETTLED — 出典は RFC-0001 の節)

| # | 能力 | 出典 |
|---|---|---|
| 1 | `RecommendationOutcome` 判別ユニオン(unique/contested/none)を梯子全段の共通戻り型に。contested の UX 契約 + 頻度予算(発火率の実装後実測 — Q19) | Q1=A、Reference-level |
| 2 | 対話/非対話のセッション単位検出(HUMAN_TURN 造幣パイプライン再利用、Stop hook transcript 分類は補助信号) | Q3=A′ |
| 3 | 非対話中断の一般機構(park guard の「無人 run は走り続けろ」前提を廃棄、#1241 の一級待ち状態) | D1/D5 |
| 4 | `solo-election.trigger.mode` キー廃止(mode 従属化・旧キー loud fail)。mirror / finding を consent 軸へ再分類し独立維持 + 実効 consent の常時可視化 | D2/D11、Q17=A |
| 5 | 宣言と projection の乖離の loud fail 化(full 限定 → 全 mode) | D3/D9 |
| 6 | 梯子⑤の縮退進行を裁定順序 3(不一意 → 対話裁定 / 非対話中断)へ置換 | D4 |
| 7 | semi milestone 空振り承認の原因調査(欠陥なら別 Issue へ分離) | D6 |
| 8 | `approve-batch` の presence 検証、presence 検査の active-scope fail-open 封鎖 | D7/D8 |
| 9 | full=無人の同一視解体 — 対話 full の人間裁定経路、Stop hook carveout 再定義(Q11) | D10 |
| 10 | semi の権限範囲再定義(`SEMI_ROUTINE_INTERACTIONS` 差し替え + `allowsOccurrence` 第 2 ガード改修)と Bolt 自律化(投影 3 面同時改修 — #3 が先行依存) | Guide-level semi 定義 |
| 11 | advisory 延期の自動化(quality-waiver 効果分類 4 箇所 + semi 効果認可上限の扱い — Q4) | Reference-level |
| 12 | UI 真実性の契約(--status / statusline での実効値可視、config と実挙動の乖離禁止) | 付録 A 指示 6・7 |
| 13 | 効果の天井の無退行(prohibited effects・NORM_CONFLICT park・code-gen 失敗停止の保持。マージのみ条件付き委任 — Q6) | Reference-level |
| 14 | ノルム 3 レイヤー(org/team/project)の該当ノルム改定を同一 intent に同梱 | Q16 |
| 15 | tracking-issue(#3116)の RFC frontmatter 記入 | frontmatter 規定 |

## 実装までに裁定すべき質問(RFC「Unresolved questions」— requirements/design 段の裁定対象)

Q2(ゲート推奨導出器)/ Q4(semi grant-less と効果上限)/ Q5(full の事後検収点)/ Q6(マージ委任条件)/ Q7(非対話 park の resume 契約)/ Q8(自己 park 脅威モデル)/ Q9(degrade スコープの WS ゲート)/ Q10(§13 0 件判定の機械化)/ Q11(Stop hook 再定義)/ Q14(REPAIR_STALLED と非対話 park の表現)/ Q15(grant ceremony 簡素化)/ Q18(consent 軸キー改名)/ Q19(contested 発火率基準)。スコープ外要確認: Q12 / Q13。

## Out of Scope

- RFC の再裁定(仕様変更はユーザー専権)。Q17-B/C 等の棄却済み代替案の再検討
- #1241 の全面実装のうち本 RFC の非対話中断が要さない部分
- 新 harness 対応・#2396 RFC ストアの一般化

## Dependencies / Sequencing / Deadline(operational 裁定)

- 依存: park guard 廃棄 → semi Bolt 自律化(先行必須)。Q1 型 → 梯子・裁定順序改修。対話検出 → D10・非対話中断
- シーケンス: dependency-first(基盤型 → 検出 → 中断機構 → mode 別権限 → 可視化・config・ノルム)
- 期限: なし
