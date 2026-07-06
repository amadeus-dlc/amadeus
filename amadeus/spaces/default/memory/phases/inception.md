# Inception Phase Guardrails（Inception フェーズの防護規定）

この規則は、`phase: inception` 宣言を持つすべての stage が、対応する phase rule としてこの文書を import する場合に適用される。

## Traceability

- 要求、ストーリー、設計要素は上流成果物（intent-statement、scope-document など）へ識別子で追跡できるようにする。
- 受け入れ条件はテスト可能な形で書き、担保する要求との対応を明示する。

## Design Honesty

- 設計は既存コードベースの実態（実在するファイル、実在する契約）を根拠にする。実在しない前例やコンポーネントを引用しない。
- 断定できない外部要因（未決着の Issue、並行作業）は「検討中」注記で扱い、確定事実として書かない。

## Right-Sizing

- 暫定機構や小規模変更に、要求されていない堅牢化・拡張性・監視を作り込まない。
