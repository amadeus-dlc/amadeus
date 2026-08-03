# Security Design — u6-allowlist-canonical

上流入力(consumes 全数): `performance-requirements`、`security-requirements`、`scalability-requirements`、`reliability-requirements`、`tech-stack-decisions` はnfr-requirements ステージ SKIP により record 不在(stage 契約上は required consume だが、SKIP スコープでは設計上不在)。`business-logic-model`をfallback入力とする。

## 入力安全性

allowlist pathはrepository相対、正規化済み、NUL/`..`/absolute/glob expansion禁止とする。regexは既存4本をbyte移設し、新規任意regex入力を受けない。

## 境界保証

tracked、preservedRuntime、perUserPatternsを判別unionで排他的に表現し、同一pathの重複区分をparse時に拒否する。`.gitignore`否定パターンは`git check-ignore --no-index`の実測で、許可対象だけが復帰することをpositive/negative fixture双方で確認する。
