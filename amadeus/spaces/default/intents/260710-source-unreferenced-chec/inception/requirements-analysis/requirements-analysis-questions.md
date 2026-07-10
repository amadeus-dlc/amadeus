# Requirements Analysis — 明確化質問(#735 / source-unreferenced-check)

> 起草: claude-engineer-3(conductor、amadeus-product-agent ペルソナ)。回答経路: election-protocol。
> 前提(RE 実測、codekb/architecture.md の合成ビュー参照): `buildTree`(package.ts L307-460)が build 入力集合の確定器で、harnessFiles は**列挙された src のみコピー**(L357-363)— 未列挙 source はどのゲートにも映らない。正当な未参照 = build 機構3種(`manifest.ts` / `onboarding.fills.ts` / codex `emit.ts` — package.ts/manifest が import で読むが dist へコピーしない)。現時点で不正な未参照 source は全 harness にゼロ(#737 で解消済み)。
> 既決事項は問わない: 落ちる実証必須(Mandated)、dist 同期(package.ts + promote:self 同一コミット)、新設検査の「文書のふりをしたフィールド」禁止(construction guardrail)。

## Q1. 参照集合の導出点(検査の真実源)

A. **buildTree 実読み記録**: buildTree が実際に読んだ source パスを記録し、`packages/framework/harness/<name>/` の実ファイル walk との差集合を未参照とする(検査が build 実装と構造的に乖離しない — build が読む=参照済みの定義が同語反復的に正しい)(起草者推奨)
B. manifest 宣言(harnessFiles/onboarding/emit)からの静的導出(build を走らせず読めるが、build 実装との二重定義になり将来 drift しうる)
C. ハイブリッド(A を正、B を高速プレチェック)— 二重実装で保守コスト増、bugfix スコープ超過気味
X. Other

[Answer]:

## Q2. build 機構3種の除外の権威(誤検出防止の設計)

A. **buildTree 側で「require/import で読んだファイル」も実読み集合へ記録**(manifest.ts / onboarding.fills.ts / emit.ts は build が現に読むため Q1=A の記録に自然に含まれ、**ハードコード除外リスト不要**。将来の build 機構追加にも自動追随)(起草者推奨)
B. manifest スキーマに除外宣言フィールドを追加(各 harness が自己申告 — 宣言漏れで偽陽性、宣言過剰で偽陰性の余地)
C. package.ts 内の静的除外定数(単純だが将来の機構追加に追随せず、「どのコードも消費しない文書」化のリスク)
X. Other

[Answer]:

## Q3. 発火点と重大度(ゲート契約)

A. **checkHarness 内に組み込み、未参照検出 = 他の drift と同じ problems 行 + exit 1**(`bun run dist:check` の既存契約に相乗り。CI 配線変更不要、開発者の修正動線も既存と同一)(起草者推奨)
B. 独立サブコマンド(`package.ts --check-sources` 等)+ CI ステップ追加(関心分離だが配線・ドキュメント・習慣の追加コスト)
C. warning のみ(exit 0)— 恒久 warning は無視され #719 の再来。非推奨
X. Other

[Answer]:

## Q4. 落ちる実証の配置層

A. **unit テスト(package.ts の検査関数を直接)+ 既存 t148 同型の注入実証**(未参照 source を一時注入 → check 赤、除去 → 緑をプロセス境界で実証)(起草者推奨)
B. smoke 層のみ(既存 t148 への追記)— package.ts の関数境界が unit で押さえられない
X. Other

[Answer]:
