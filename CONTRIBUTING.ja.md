# Amadeus への貢献

Amadeus への貢献に関心を持っていただき、ありがとうございます。
この文書は、貢献のライセンス条件と進め方を説明します。

[English](CONTRIBUTING.md) | [日本語](CONTRIBUTING.ja.md)

## 貢献のライセンス条件

Amadeus は MIT OR Apache-2.0 のデュアルライセンスです。
詳細は [LICENSE-MIT](LICENSE-MIT) と [LICENSE-APACHE](LICENSE-APACHE) を参照してください。

個人か企業かを問わず、各貢献者は自分の貢献分の著作権を保持します。
著作権譲渡や CLA はありません。

明示的に別の条件を示さない限り、Apache-2.0 ライセンスの定義に従ってこのプロジェクトへ意図的に提出された貢献は、追加の条件なしに MIT OR Apache-2.0 のデュアルライセンスで提供されたものとみなします。

## Developer Certificate of Origin

すべての commit に sign-off を付け、[Developer Certificate of Origin](https://developercertificate.org/) の定義に従って、プロジェクトのライセンスで提出する権利があることを表明してください。

各 commit に `Signed-off-by` 行を追加します。

```sh
git commit -s
```

sign-off には、連絡がとれる名前とメールアドレスを使ってください。

## 進め方

- 大きな変更を始める前に、対象範囲、影響する skill、期待する成果物、検証計画を GitHub Issue に記録してください。
- 作業 branch は最新の `origin/main` を基点に作ってください。
- pull request を作る前に、ローカルで検証してください。

```sh
npm run test:all
```

## 言語の慣例

- `README.md` とこの文書は英語で書き、日本語版を併置します。
- `.amadeus/**`、`skills/**`、`.agents/skills/**` の Markdown 成果物は日本語で書きます。
