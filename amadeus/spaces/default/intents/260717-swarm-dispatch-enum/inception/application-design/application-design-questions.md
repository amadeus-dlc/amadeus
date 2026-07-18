# Application Design — 明確化質問(swarm-dispatch-enum / Issue #1157)

上流入力(consumes 全数): `requirements.md`、`architecture.md`、`component-inventory.md`、`team-practices.md`。

## 判定サマリ(E-OC1 3段順序)

判定: 真に未決の設計判断は Q1 の 1 問のみ(選挙対象)。他の設計面は既決要件からの導出として選挙不要: FR-4 が driver 語彙の一対一(ultracode→claude-ultra 置換)を、FR-1 の表が harness 別挙動を、FR-7 が referee 意味論不変を確定済み。`SWARM_DEGRADED` の Fallback driver ハードコード(amadeus-swarm.ts:291)は降格先が常に native floor(subagent)であるため維持が要件から機械的に導出される(ADR に記録)。C-18(retry identity)は constraint-register が Functional Design への委任を明記済み。照合面: `requirements.md` FR-1〜FR-10/NFR-1〜6、`architecture.md`/`component-inventory.md` の swarm seam(区間無変更)、`team-practices.md` の Testing Posture。
conductor e2 が 2026-07-18T00:03Z 頃に leader へ申告し、leader が 2026-07-18T00:04:32Z に承認した(agmsg 出典)。

## Q1: C-16 機械検証境界(selected driver / degraded-from / error の決定)の実現形

FR-6 は「raw env と実行 harness から決定する境界を prose だけに依存せず機械検証可能とする」ことを要求し、実現形を本ステージへ委任している(pre-approved)。実現形の選択肢:

A. `amadeus-swarm.ts` に `resolve` サブコマンドを新設(env 読み+`--harness <name>` 引数 → JSON {driver, degradedFrom?, error} を stdout、fail-closed は exit 1)+ 決定ロジックは exported 純関数(in-process seam でテスト、spawn-blindspot 回避)。SKILL prose は「dispatch 前に resolve を実行し、exit 1 なら停止・出力 driver に従う」の1手順になる
B. lib(amadeus-lib.ts)の exported 純関数のみ(ツール面なし)— テストは機械検証可能だが、conductor が実行時に呼べる CLI 面がなく、prose 依存の実行時判定が残る(C-16 の「prose だけに依存せず」を実行時に満たさない懸念)
C. 新規独立ツール(amadeus-driver.ts 等)を新設 — referee と分離されるが、driver 語彙の一対一管理が2ファイルへ分散し、S-06(referee vocabulary and audit の同期)の凝集を損なう。新規機構導入は reuse inventory の「既存で代替できない根拠」を要する
X. Other (please specify)

[Answer]: A — `amadeus-swarm.ts` に `resolve` サブコマンド新設+exported 純関数(E-SDE-AD 裁定、開票 2026-07-18T00:05:37Z、採用 3/3 全て GoA 1、留保必須票 0 件)。
裁定根拠(開票配信より): (1) main の3サブコマンド switch(:747-788)への第4 case 追加は FR-7 意味論に非干渉な加算 (2) FR-6/C-16 の pre-approved 委任の枠内 (3) in-process テストと実行時機械検証を両立できるのは A のみ(agmsg 出典)
