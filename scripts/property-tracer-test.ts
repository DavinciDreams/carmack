// scripts/property-tracer-test.ts
// This file is intentionally missing the 'missingProp' property on TestClass.
// The tracer should add it automatically.

class TestClass {
  value: number;
  missingProp: any;
  constructor() {
    this.value = 42;
  }
  doSomething() {
    // Usage of missing property
    this.missingProp = "should be added";
  }
}

function testUsage(obj: TestClass) {
  obj.missingProp = "also triggers property addition";
}