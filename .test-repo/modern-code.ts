
// Modern TypeScript code
const modernVariable = 'already good';
const anotherConst = 42;

const arrowFunction = () => {
  return 'already modern';
};

const templateLiteral = `Hello ${name}!`;

interface ModernInterface {
  value: string;
  method(): string;
}

export class ModernClass implements ModernInterface {
  constructor(public value: string) {}
  
  method(): string {
    return this.value;
  }
}
