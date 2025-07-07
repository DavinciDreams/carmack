// Final comprehensive test - TypeScript errors that should be auto-fixed
declare const value: string | null;
declare const items: string[];
declare const target: string;
declare const name: string;
declare const userName: string;
declare const appName: string;

const problematicVar = "this should become const";
const numericVar = 42;
if (value == null) {
  console.log("loose equality should become strict");
}

if (items.indexOf(target) != -1) {
  console.log("should use includes and strict inequality");
}

const unnecessaryReturn = (x: number) => x * 2;

const message = `Hello ${userName}, welcome!`;

export { problematicVar, numericVar, unnecessaryReturn, message };
