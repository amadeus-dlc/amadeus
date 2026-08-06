# Requirements Analysis — 明確化質問(260805-cross-harness-resume)

上流入力(consumes 全数): business-overview.md、architecture.md、code-structure.md

既決事項(質問しない): (1) ユーザー指示(2026-08-05、RE diary Interpretations に記録)により「どのハーネスの組み合わせでも引き継ぎ可能」が要件。(2) intent 記述により「エラーメッセージへの復旧手順ガイド追加」は要件(現状ガイド不在は RE §4 で実測済み)。(3) 拒否4原因が同一の `role "unknown"` に畳まれる判別不能性の解消は (2) の前提として要件(決定的再現 C1-C6 で実測済み)。

判定根拠: 以下は RE(codekb/amadeus/re-scans/260805-cross-harness-resume.md)が requirements へ送った裁定事項のうち、既決から一意に導出できない設計判断のみ。

---

## Q1. 復旧経路の主形態

別ハーネス/別セッションからワークフローを引き継ぐ復旧経路を、どの形で提供しますか。RE 実測: 現状は session carrier を修復する verb が存在せず(grep 0 hit)、Kimi 拒否状態では `unpark` すら打てないデッドロック(所見A)。kimi の SessionStart は発火すれば baseline を張り直し deny ラッチも消す(自動回復)が、発火しない条件(hook 未配線・matcher 不一致)で詰まる。

A. 専用の復旧 verb を新設する(例: `amadeus-utility.ts session-takeover`)— caller-authorization の外側に置き、人間確認付きで carrier を現セッションへ再バインドする
B. doctor を拡張する — carrier 状態の診断+`--repair` での再バインドを doctor 系に統合する
C. SessionStart の自動回復を強化する — 各ハーネスの SessionStart で「前セッションが別ハーネスだった」場合に carrier を自動再バインド(人間確認なし)
D. A+C の併用 — 自動回復を既定にしつつ、hook 不発時の手動復旧 verb も備える(二層)
E. B+C の併用 — 自動回復+診断/修復は doctor へ
X. Other (please specify)

[Answer]: D — 自動回復+手動 verb の二層。SessionStart 自動回復を既定にしつつ、hook 不発時の手動復旧 verb も備える

## Q2. `.current-session` を書かない3ハーネス(kiro-ide / opencode / pi)の扱い

RE 所見B: kiro-ide(session_id 転送なし)/ opencode(session-start hook 呼出なし)/ pi(ネイティブ audit、core hook 不使用)は `.current-session` を書かず、これらのセッションから Kimi への引き継ぎは carrier を持たない。「どのハーネスでも」要件に対しどこまで本 intent で扱いますか。

A. 3面とも session-start 配線を追加して `.current-session` を書くよう是正する(全8面対称化)— 本 intent のスコープに含める
B. 復旧経路(Q1)が carrier 不在ケースを吸収できる設計にし、3面の配線是正は別 Issue へ切り出す
C. kiro-ide のみ是正(core hook は呼んでおり session_id 転送だけの欠落)し、opencode / pi は別 Issue へ
D. 3面の是正も復旧経路の吸収も本 intent では扱わず、制約として requirements に明記のみ
X. Other (please specify)

[Answer]: B — 復旧経路(Q1)が carrier 不在ケースを吸収できる設計にし、3面(kiro-ide / opencode / pi)の session-start 配線是正は別 Issue へ切り出す

## Q3. `AMADEUS_HARNESS_TYPE` による未文書の認可バイパスの扱い

RE 実測: `AMADEUS_HARNESS_TYPE` を kimi 以外に設定すると `authorizeMainConductor` は無条件 authorized になる(detectHarnessType の env 最優先分岐)。docs は intent-birth provenance override としてのみ記述。self-fix スコープでどう扱いますか。

A. 本 intent で塞ぐ — 認可判定では env override を信用せず、実検出(script path / cwd probe)で kimi を判定する
B. 本 intent ではバイパスを既知の制約として文書化のみ(復旧経路の設計がこの env に依存しないことを要件化)し、封鎖は別 Issue へ
C. バイパスを公式の復旧手段として文書化する(env 設定を正規の引き継ぎ手順に昇格)
X. Other (please specify)

[Answer]: B — 本 intent ではバイパスを既知の制約として文書化のみ(復旧経路がこの env に依存しないことを要件化)。封鎖は別 Issue へ

## Q4. kimi adapter の raw-cwd(carrier 分裂)の是正

RE 実測: kimi adapter は raw cwd を projectDir に使い(`amadeus-kimi-lib.ts:704`)、core hook の workspace-marker 検証ラダーと非対称。サブディレクトリ cwd で carrier が分裂し denied "unknown" になる(決定的再現 C6)。この挙動は `tests/integration/t-kimi-adapter.test.ts:413` がテスト契約としてピンしており、是正には要件段での仕様裁定とテスト契約の明示改訂が必要(cid:reverse-engineering:c1-pinned-behavior-ruling)。

A. 本 intent で是正する — adapter も marker 検証ラダーへ寄せ、t-kimi-adapter:413 の契約を明示改訂する(要件に改訂対象テストを明記)
B. 本 intent では是正せず、復旧経路(Q1)が分裂ケースも回復できることを要件化し、根本是正は別 Issue へ
C. 是正も吸収もせず制約として文書化のみ
X. Other (please specify)

[Answer]: B — 本 intent では是正せず、復旧経路が carrier 分裂ケースも回復できることを要件化。adapter の marker 検証対称化(t-kimi-adapter:413 契約改訂を伴う)は別 Issue へ

## Q5. 引き継ぎ実行時の人間確認

引き継ぎ(takeover)は「どのセッションが main conductor か」という mutation 権限の移動であり、subagent 詐称防止(現行 carrier 機構が守る対抗価値)と緊張します。復旧経路の発動に人間確認を要求しますか。

A. 要求する — 復旧 verb / 自動回復のいずれも、実行前にその場の人間承認(HUMAN_TURN 接地)を必須とする
B. 手動復旧(verb / doctor --repair)のみ人間確認必須、SessionStart 自動回復(正規 hook 発火 = ハーネスが実セッションを保証)は確認不要
C. 要求しない — fail-closed の解消を優先し、復旧は無確認で通す
X. Other (please specify)

[Answer]: B — 手動復旧 verb は人間確認(HUMAN_TURN 接地)必須。SessionStart 自動回復(正規 hook 発火 = ハーネスが実セッションを保証)は確認不要

## 裁定の記録

- 回答方式: ガイドモード(AskUserQuestion)によるユーザー直接回答。選挙対象外(明確化質問はソロ選挙 auto 発動3類型の対象外であり、Q1-Q5 はいずれもスコープ裁定 = ユーザー専権)
- ユーザー承認: 2026-08-05T13:33:27Z(Q1-Q4 一括回答 → Q5 回答。全5問とも推奨選択肢を選択)
- 帰結: 本 intent の変更面は (a) 復旧経路の二層化(SessionStart 自動回復強化+人間確認付き手動復旧 verb) (b) エラーメッセージの原因判別化+復旧ガイド追加 に限定。3ハーネス配線・env バイパス封鎖・raw-cwd 対称化は別 Issue へ切り出す
