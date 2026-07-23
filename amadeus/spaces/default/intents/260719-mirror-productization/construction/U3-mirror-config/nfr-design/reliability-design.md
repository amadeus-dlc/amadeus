# Reliability Design — U3-mirror-config

上流入力(consumes 全数): performance-requirements.md、security-requirements.md、scalability-requirements.md、reliability-requirements.md、tech-stack-decisions.md、business-logic-model.md

## RD-U3-1: 読取結果の明示的分類(RL-U3-1/RL-U3-3)

各設定面の読取結果を`absent | parsed | invalid`へ分類する。不在は`ENOENT`およびdangling symlinkの同等エラーだけとし、ディレクトリ誤指定、権限拒否、その他I/O失敗をabsentへ丸めない。これによりBunのmacOS/Linux間の`readFileSync`差を回避し、予期しないI/O異常をloudなinvalidとして保持する。

## RD-U3-2: 全面評価後の原子的解決(RL-U3-1)

3面をすべて評価してinvalidを層名付きで全件収集し、1件でもあれば`ResolveOutcome.invalid`だけを返す。invalidがない場合に限りparsed面を後勝ちマージするため、部分成功や古いdefaultでの継続は起きない。外部サービスがないため、リトライ、サーキットブレーカ、フェイルオーバーは導入しない。

## RD-U3-3: 決定的default(RL-U3-2)

3面すべてがabsent、または合法面に`auto-mirror`指定がない場合は、単一正本のdefaultから`{ autoMirror: false }`を返す。default値を読取層ごとに複製しない。

## 障害注入と回帰検証

unitテストでinvalid混在、複数invalidの全件列挙、全不在defaultを検証する。実FS integrationテストでは通常ファイル、ENOENT、dangling symlink、ディレクトリ誤指定を注入し、前二者だけがabsent、後者がloudな失敗になることを固定する。
