// Structural contract for the deterministic question compiler.
//
// This proves only that an accepted answer preserves the answer kind declared
// by the compiled question. It makes no claim that an English parse is the
// intended interpretation or that a resolver's world knowledge is correct.

datatype AnswerKind = BooleanKind | CardinalityKind | ChoiceKind | TextKind

datatype Cardinality = Finite(value: nat) | CountablyInfinite | UncountablyInfinite

datatype TypedAnswer =
  BooleanAnswer(booleanValue: bool)
  | CardinalityAnswer(cardinalityValue: Cardinality)
  | ChoiceAnswer(choiceValue: string)
  | TextAnswer(textValue: string)

datatype AnswerContract =
  BooleanContract
  | CardinalityContract
  | ChoiceContract(options: seq<string>)
  | TextContract

function KindOfAnswer(answer: TypedAnswer): AnswerKind
{
  match answer
  case BooleanAnswer(_) => BooleanKind
  case CardinalityAnswer(_) => CardinalityKind
  case ChoiceAnswer(_) => ChoiceKind
  case TextAnswer(_) => TextKind
}

function KindOfContract(contract: AnswerContract): AnswerKind
{
  match contract
  case BooleanContract => BooleanKind
  case CardinalityContract => CardinalityKind
  case ChoiceContract(_) => ChoiceKind
  case TextContract => TextKind
}

predicate ValidContract(contract: AnswerContract)
{
  match contract
  case ChoiceContract(options) => |options| >= 2 &&
    forall left, right :: 0 <= left < right < |options| ==> options[left] != options[right]
  case _ => true
}

predicate Accepts(contract: AnswerContract, answer: TypedAnswer)
{
  ValidContract(contract) &&
  match contract
  case BooleanContract => (
    match answer
    case BooleanAnswer(_) => true
    case _ => false)
  case CardinalityContract => (
    match answer
    case CardinalityAnswer(_) => true
    case _ => false)
  case ChoiceContract(options) => (
    match answer
    case ChoiceAnswer(choice) => choice in options
    case _ => false)
  case TextContract => (
    match answer
    case TextAnswer(text) => |text| > 0
    case _ => false)
}

lemma AcceptedAnswerPreservesKind(contract: AnswerContract, answer: TypedAnswer)
  requires Accepts(contract, answer)
  ensures KindOfAnswer(answer) == KindOfContract(contract)
{
  match contract
  case BooleanContract =>
    assert answer.BooleanAnswer?;
  case CardinalityContract =>
    assert answer.CardinalityAnswer?;
  case ChoiceContract(options) =>
    assert answer.ChoiceAnswer?;
  case TextContract =>
    assert answer.TextAnswer?;
}

lemma AcceptedChoiceBelongsToOptions(options: seq<string>, answer: TypedAnswer)
  requires Accepts(ChoiceContract(options), answer)
  ensures match answer
    case ChoiceAnswer(choice) => choice in options
    case _ => false
{
}

method ValidateAnswer(contract: AnswerContract, answer: TypedAnswer) returns (accepted: bool)
  ensures accepted <==> Accepts(contract, answer)
  ensures accepted ==> KindOfAnswer(answer) == KindOfContract(contract)
{
  accepted := Accepts(contract, answer);
  if accepted {
    AcceptedAnswerPreservesKind(contract, answer);
  }
}
