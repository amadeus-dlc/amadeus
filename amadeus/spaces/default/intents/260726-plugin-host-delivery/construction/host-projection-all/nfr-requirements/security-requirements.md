# セキュリティ要件 — U3 host-projection-all

> 上流入力(consumes 全数): business-logic-model、business-rules、requirements、technology-stack

## 脅威モデルと境界

U3 は `technology-stack.md` 実測どおり Bun/TypeScript ESM のビルド時ツールであり、ネットワーク・認証情報・外部サービスを扱わない(technology-stack.md「HTTP・DB はない」)。セキュリティ上の攻撃面は、投影が書き込む出力先(outDir)への **path 安全性**に限定される。`requirements.md` FR-2 の第 3 合否「出力先の安全性(非投影ディレクトリ・symlink・file outDir の拒否)」と、`business-rules.md` BR-U3-3 の OutDirRefusal 拒否集合がこの境界の中核である。

## SEC-U3-1: outDir 拒否集合(mutation 前拒否)

`business-logic-model.md` フロー 1 の「outDir 安全検査(OutDirRefusal — plan 段で mutation 前拒否)」を、`business-rules.md` BR-U3-3 のとおり mutation 前(plan 段)で判定し、生 stack を出さずに拒否する。`requirements.md` FR-2 は上流 t188 #27-32 と同等の拒否集合を要求する。

- 合否: 非投影ディレクトリ・symlink・file outDir 等の危険な出力先を、投影の書き込み(mutation)より前に plan 段で拒否する(fixture 対照テスト — BR-U3-3 の 5-6 ケース)
- 合否: 拒否時は生の I/O stack トレースを出さず 1 行 usage エラーで返す(`business-logic-model.md` エラー処理「no ENOTDIR/EEXIST stack」相当、上流 #29/#31)
- 合否(落ちる実証): 真正な先行投影ディレクトリのみ上書き許可し、それ以外を拒否する。正当な既存投影で赤くならないことも両側実測する(`business-logic-model.md`「実行順」の corpus-sweep-for-new-guards)

## SEC-U3-2: トークン置換の安全性

`business-logic-model.md` フロー 1 のトークン置換は既存 harness-transform の再利用であり(BR-U3-1 単一正本)、新規のテンプレート評価器・コード実行経路を導入しない。`requirements.md` NFR-3(Bun-only、runtime dependency 追加禁止)により、外部テンプレートエンジン等の攻撃面を持ち込まない。

- 合否: トークン置換は既存 harness-transform 経路のみを使い、任意コード評価(eval 相当)を導入しない(diff 検分 — 新規依存ゼロは tech-stack-decisions.md と共有)

## SEC-U3-3: 認可・監査面への非干渉

`requirements.md` NFR-1 は trust grant・監査整合の現行水準維持を求める。U3 の投影はホストツリーへのファイル生成のみで、認可判定・監査イベント発行の経路には触れない。

- 合否: U3 の変更が directive contract / state transition / audit invariant のテスト群(`requirements.md` NFR-1・project.md Mandated 認可テスト群)を退行させない(N/A ではなく非干渉の実証 — 認可経路を触らないことを diff で確認)

## 非該当カテゴリ(N/A + 根拠)

- 認証 / 認可情報の保持: N/A。U3 はビルド時ツールで credential を扱わない(technology-stack.md 実測)。secret のハードコード検査は該当コードが無いため非適用
- 入力サニタイズ(ネットワーク入力): N/A。外部からの不定長入力を受けない。唯一の外部境界は outDir パスで、SEC-U3-1 の拒否集合が担保する
