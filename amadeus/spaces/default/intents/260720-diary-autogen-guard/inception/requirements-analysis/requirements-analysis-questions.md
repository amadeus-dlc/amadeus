# Requirements Analysis Questions — 260720-diary-autogen-guard

> **E-OC1 判定ヘッダ**: Q1〜Q3 は未決の設計判断につき**エージェント選挙で裁定**する(leader ディスパッチ 02:47:23Z「修正方式は選挙・単独決定禁止」)。[Answer] は裁定受領後にのみ記入。選挙不要判定の質問なし。
> 選挙依頼送信: leader へ 2026-07-20T03:2xZ(agmsg)。裁定受領・記入時に本ヘッダへ開票タイムスタンプを追記する。

上流入力(consumes 全数): business-overview.md(N/A — 根拠は requirements.md 冒頭注記)、architecture.md、code-structure.md(実参照は requirements.md §2)

## Q1. 書込保証の修正方式(3直交軸のうち軸(ii) — 本 intent の中核)

背景(RE 確定、re-scans/260720-diary-autogen-guard.md): diary chokepoint(orchestrate.ts:1172)の guard `recordPrefix !== null` は activeIntent の cursor 解決に完全依存し、pd(CLAUDE_PROJECT_DIR 優先 — lib.ts:215-216)が cursor 非解決ツリーを指すと無音 skip。audit/report 系は `--intent` 明示アンカー(amadeus-audit.ts:433)で cursor 非依存 — diary 経路のみ非対称に脆弱(pd-swap の決定的再現あり)。

選択肢:
A. **diary 経路への明示 intent アンカー導入** — 発行 chokepoint は directive の memory_path(intent slug を既に含む)を持っており、cursor 再解決に依存せず memory_path 由来の intent で ensureStageDiary を駆動する(audit 系と対称化 — 非対称の解消、最高レバレッジ)
B. recordPrefix null かつ intent 実在時をエラー化(loud fail)— 書込は保証しないが無音は消える
C. null 時の再解決リトライ(cursor 再読/lone-intent 緩和)— 解決率は上がるが根本の非対称は残る
X. Other (please specify)

[Answer]:

## Q2. 検出契約(軸(i) — 正当 skip とバグ skip の識別)

背景: guard は「birth 前 shell(正当 skip)」と「intent 実在だが解決失敗(バグ)」を無音混同。template-missing 枝のみ stderr 警告あり(非一貫)。

選択肢:
A. **バグ skip 側を stderr advisory で loud 化**(intent record dir が実在するのに recordPrefix null の場合のみ警告 — stdout-directive-stderr-advisory 契約に整合。Q1=A 採用時も防御層として併存可)
B. loud 化しない(Q1 の書込保証で十分 — 警告の追加ノイズ回避)
X. Other (please specify)

[Answer]:

## Q3. 環境・lifecycle 軸(軸(iii))のスコープ

背景: (d) pd 解決順の見直し(CLAUDE_PROJECT_DIR 優先の再考)は影響範囲が全ツール横断で ADR 級。(e) cursor lifecycle 堅牢化は e2 の #1258(c499c1efb、cursor 完了時解放)と同面。

選択肢:
A. **両方ともスコープ外** — (d) は別 Issue 起票(ADR 前提の独立 intent)、(e) は #1258 着地済み面として本 intent では触れない(修正面を diary 経路に限定 — 最小 surgical)
B. (d) のみ別 Issue、(e) の cursor 再解決を Q1=C と組み合わせて本 intent に含める
X. Other (please specify)

[Answer]:
