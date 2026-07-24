# プラクティス発見エビデンス

## 走査範囲

- Pipeline/Deployment: `.github/workflows/ci.yml`、`.github/workflows/release.yml`、直近30コミット、branching strategy KB
- Quality: `package.json`、coverage・patch・complexity gates、test registry、直近 metrics
- Developer: `tsconfig.json`、`biome.json`、core／harness／setup の構造、Mirror関連実装
- DevSecOps: CI permissions、依存監査、secret／SAST／DAST設定、release provenance、Mirror外部操作境界
- 既存の `org.md`、`team.md`、`project.md` と Reverse Engineering CodeKB

## Pipeline/Deployment 所見

`main` と短命ブランチ、Pull Request、squash を中心とする GitHub Flow／trunk-based 寄りの履歴が確認できた。CI は push と Pull Request で typecheck、lint、complexity、生成物 drift、smoke・unit・integration、coverage を検査し、release は手動 dispatch から version、tag、GitHub Release、npm publish provenance を作る。常設環境やアプリケーション deployment topology は存在しない。

## Quality 所見

Bun の smoke 14、unit 263、integration 213、e2e 77、計567テストファイルを確認した。最新 metrics は7,051 assertions、line coverage 80.8942%で、日常 CI は相対 project coverage ratchet、PR patch coverage、complexity、dist・self-install drift を blocking とする。履歴は回帰テストと落ちる実証を重視するが、すべての変更へ厳格な red-green 順序を要求する証拠はないため、`test-alongside + defect/gate regression-first` と判断した。

## Developer 所見

TypeScript／ESM、Bun、strict typecheck、Biome lint を採用し、formatter と import organizer は無効である。`amadeus-*.ts`、camelCase、PascalCase、UPPER_SNAKE_CASE が支配的で、core は純粋な parser・decision・renderer と I/O handler を判別 union で分離する。正本は `packages/framework/core/` と harness overlay であり、`dist/` と self-install 面は生成物である。

## DevSecOps 所見

frozen lockfile、生成物 drift gate、GitHub App の限定権限、npm provenance は確認できた。一方、専用 SAST、DAST、secret scan、dependency audit の blocking CI はなく、`bun audit` は High 3件を含む12 advisoryを報告した。Mirror は `gh` を argument array で呼び credential storeへ委譲するが、現行 close は Issue ownership provenance を検証しないため、本 Intent では fail-closed ownership check が必須である。

## 既決事項と質問

新しい質問は0件である。5領域の既存プラクティスがすでに存在し、本 Intent 固有の walking skeleton と `auto` の限定的な継続同意は Ideation の各ゲートでユーザーが直接承認済みだったため、同じ判断を再演しなかった。未導入の一般的な SAST・secret scan・dependency gate、Actions SHA pin、trusted publishing は今回の Mirror 三モード化のスコープ外として新しい hard rule にせず、既存 advisory は後続の品質評価で明示する。

## 推論と制約

`auto` の継続同意は mirror create・sync・provenance検証済みcloseだけに限定し、PR merge、release、publish、deployment、その他の外部操作へ一般化しない。GitHub障害は workflow を非阻害にする一方、構成値の型違反や provenance 不一致は安全契約違反として fail-closed を維持する。
