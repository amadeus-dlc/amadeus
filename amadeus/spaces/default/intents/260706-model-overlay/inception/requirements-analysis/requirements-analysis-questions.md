# Requirements Analysis Questions：260706-model-overlay

回答方法: 各質問の `[Answer]:` に選択肢の記号を記入する。

## Q1: parity 整合の方式（Issue #554 の主要論点）

前提（実測済み）: parity-baseline.json は engine ファイルの sha256 hash だけを保持し、内容を持たない。overlay がディスク上の agent 定義（例: `agents/amadeus-architect-agent.md` の `modelOverride: opus` → `fable`）を書き換えると hash 不一致になる。「hash の側を正規化する」ことはできないため、比較時にディスク側を逆変換してから hash するか、比較対象・宣言を変えるかの選択になる。

A. 逆変換正規化: overlay 設定に書き換え前の base 値を保持し（適用スクリプトが適用時に記録）、parity-check は overlay 宣言済みファイルに限り modelOverride 値を base へ戻した内容で hash を計算して比較する。engineFileExceptions の増加ゼロ、modelOverride 行以外の乖離は従来どおり検出される。
B. overlay 適用前の生成物を別途保持し、それを比較対象にする（中間生成物の管理が増える）。
C. overlaid な agent ファイルを engineFileExceptions へ追加する（最も単純だが、Issue の「exceptions 増加を最小に」に反し、modelOverride 以外の乖離も検出されなくなる）。

[Answer]: A（ピア協議 2026-07-06T05:35Z、leader・engineer1・engineer2・engineer4・engineer5・reviewer の 6 者一致で成立（engineer2 と engineer4 は独立実測つき追認））。取り込む条件・補足: leader 条件 = 上流が modelOverride を変えて overlay の base 値が実際の上流値とずれた場合に parity が正しく fail することを eval で固定（無言の見逃し禁止）。engineer5 = 適用 → 逆変換 → base と byte 一致のラウンドトリップを eval で固定（変換が単純置換で閉じることの検証）。engineer1 = 実装は parity-check.ts の既存 normalizeContent 機構（#553 の reverse 写像）へ自然に追加でき、往復可逆の機械検証を採用前に行う（#553 の写像規律）。C の不採用根拠は #542 の教訓（例外は他の乖離を見えなくする）とも一致。

## Q2: fallback（Issue 案 (b)）の発動点

前提: 「指定モデルが利用不可」の機械的な検知は、オフライン前提の決定論的ツール（dev-scripts、doctor）からは API 照会なしにはできない。

A. 適用スクリプトの明示フラグ（例: `--use-fallback`）で人間がモデル終了を認知した時に切り替え、overlay 設定の宣言済み fallback（fable → opus）へ降格 + 警告出力する。加えて doctor に「実ファイルの modelOverride が overlay 宣言（fallback 込み）のどれとも一致しない場合の警告」を足し、乖離を表面化する。
B. 適用時に provider API へ照会して自動判定する（新規依存・ネットワーク前提となり、オフライン検証と依存方針に反する）。
C. 実行時ハーネス（Task 呼び出し失敗）に委ね、ツール側は何もしない。

[Answer]: A（6 者一致）。reviewer 補足を取り込む: fallback の発動記録（対象ファイルと理由）を overlay 設定または適用結果に残し、doctor 警告だけでなく PR レビュー時に意図した fallback かを判定できるようにする。

## Q3: overlay 適用点の構成（reverse-engineering の発見の確認）

前提（実測済み）: engine の `.agents/amadeus/agents/`（modelOverride の実体）は promote-skill.ts の書き込み対象外で、上流同期・インストーラ更新で全置換される。

A. 単独実行可能な適用スクリプト（例: `dev-scripts/apply-model-overrides.ts`）を正とし、promote-skill.ts の最終段からも同スクリプトを呼ぶ（skills 側に agents/ を含む skill がある場合に備える）。上流同期後は単独実行で再適用する。npm script（例: `models:apply`）と test:it eval を追加。
B. promote-skill.ts 内にのみ実装する（engine agents に届かず、Issue の目的 = 設計系 agent の Fable 固定を達成できない）。
C. その他。

[Answer]: A（6 者一致）。取り込む条件・補足: leader = 上流同期（全置換）後の再適用手順を運用文書に 1 行残す。engineer5 = dev-scripts を skill の実行時依存にしない規則との整合（適用は promote / dev 時に閉じ、実行時は適用済み成果物だけを読む）。engineer1 = #553 が agents/ の persona 文書 22 ファイルに触れる（modelOverride 行は不変更で衝突なし見込み）ため、適用スクリプトは #553 merge 後の実形を基準にする（順序制約とも整合）。
