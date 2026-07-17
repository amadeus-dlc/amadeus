# Logical Components — U4 verification-docs

intent: 260715-opencode-cursor-harness / Unit: U4
上流入力: nfr-requirements(tech-stack-decisions.md TS-U4-1/2)、functional-design(domain-entities.md)、application-design(components.md C4/C5)。

## 論理コンポーネント構成

| コンポーネント | 実体 | 責務 | NFR 割当 |
| --- | --- | --- | --- |
| smoke test | tests/smoke/t<NNN>-opencode-cursor-dist-structure.test.ts | 期待ファイル表×2 の存在検査+harness.json 値+--check 編入 | RL(落ちる実証)、SC(表追記)、PR(fs 直読) |
| README 更新 | README.md ハーネス表 | 対応状況の1行×2 | SR(プレースホルダ) |
| harness guide 更新 | docs/harness-engineering/(対象ページは Unit 冒頭で実測特定) | 実行モデル・制約・機能単位表 | RL-U4-2(出典列) |
| Issue 2本 | GitHub | installer(台帳+再現)/ opencode hooks(将来) | — |

依存方向: すべて dist/opencode・dist/cursor の生成結果(U1〜U3)への読み取り依存のみ。

## 上流参照(consumes 全数)

本設計の入力: 同 unit の nfr-requirements 5点(performance-requirements.md / security-requirements.md / scalability-requirements.md / reliability-requirements.md / tech-stack-decisions.md)+ functional-design の business-logic-model.md。継承元 = U1 の nfr-design(U1 自身は本節が自己参照)。
