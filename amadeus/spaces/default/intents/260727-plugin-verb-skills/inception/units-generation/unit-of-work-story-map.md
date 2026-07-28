# Story Map — 260727-plugin-verb-skills

上流入力(consumes 全数): unit-of-work.md(U1〜U4)、requirements.md(FR)、services.md(入口3系統)、components.md、component-methods.md、component-dependency.md、decisions.md

## ジャーニー × Unit 対応

| ジャーニー(アクター) | 現状の痛み | Unit | 得られる体験 |
|---|---|---|---|
| 運用確認(Amadeus 利用開発者) | raw CLI の手叩きのみ | U1 | `/amadeus plugin status` / `doctor` が全ハーネスで統一入口に |
| plugin 導入(利用開発者) | INSTALL.md の2手作業(コピー→compose) | U2 | `install <path>` 1操作(冪等・fail-closed) |
| plugin stage 実行(plugin 作者/利用者) | compose 後も `/amadeus-<slug>` が無い(#1598) | U3 | stock stage と同じ単段実行入口 |
| ガード付き操作+学習(全員) | スキル導線・docs が raw CLI 案内のまま | U4 | `/amadeus-plugin` スキルと更新された 19-plugins |

## 順序に関する注記

実装順・Bolt シーケンスの裁定は 2.8 Delivery Planning の専管事項であり本書では定めない。ideation の intent-backlog に walking skeleton 候補(最小 end-to-end スライス)と dependency + risk-first の方針記録があり、2.8 はそれと unit-of-work-dependency.md の DAG(U4 のみ終端依存)を材料に確定する。

## ストーリー粒度の受け入れ(Given/When/Then 例)

- U1: Given 任意のハーネス、When `/amadeus plugin status` を実行、Then plugin CLI の status 出力と exit code がそのまま返る
- U2: Given plugin ディレクトリ、When `install <path>` を2回実行、Then 2回目は identical 続行で副作用なし(不一致時は exit 1+`--force` 案内)
- U3: Given compose 済みホスト、When compose 完了、Then `/amadeus-<slug>` runner が存在し、drop 後は残存しない
- U4: Given 任意のハーネス、When `/amadeus-plugin` を起動、Then status first → 固定 verb のガード付き導線が提示される
