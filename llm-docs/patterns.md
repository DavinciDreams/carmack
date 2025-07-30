# Transformation Patterns

Generated on 2025-07-23T03:16:25.949Z

## Modernization

### Smart Var To Const Let

Smart conversion of var to const/let based on value analysis

**Complexity:** 2/10

**Risk Level:** low

**Pattern:**
```typescript
var $IDENTIFIER = $VALUE
```

**Replacement:**
```typescript
const $IDENTIFIER = $VALUE
```

**Examples:**

*Simple string literal should use const*

Before:
```typescript
var name = 'John';
```

After:
```typescript
const name = 'John';
```

*Expression with operator should use let*

Before:
```typescript
var counter = i + 1;
```

After:
```typescript
let counter = i + 1;
```

---

### Template Literal Advanced

Convert string concatenation to template literals with smart quote handling

**Complexity:** 3/10

**Risk Level:** low

**Pattern:**
```typescript
$STRING + $IDENTIFIER + $STRING
```

**Replacement:**
```typescript
`${$STRING.slice(1, -1)}${$IDENTIFIER}${$STRING.slice(1, -1)}`
```

**Examples:**

*Basic string concatenation with variables*

Before:
```typescript
'Hello ' + name + '!'
```

After:
```typescript
`Hello ${name}!`
```

---

### Array Includes Modernization

Use Array.includes() instead of indexOf() !== -1

**Complexity:** 2/10

**Risk Level:** low

**Pattern:**
```typescript
$ARRAY.indexOf($ITEM) !== -1
```

**Replacement:**
```typescript
$ARRAY.includes($ITEM)
```

**Examples:**

*Basic indexOf to includes conversion*

Before:
```typescript
if (items.indexOf('test') !== -1) { console.log('found'); }
```

After:
```typescript
if (items.includes('test')) { console.log('found'); }
```

---

### Null Coalescing Opportunity

Use nullish coalescing operator for null/undefined checks

**Complexity:** 3/10

**Risk Level:** medium

**Pattern:**
```typescript
$VARIABLE || $DEFAULT
```

**Replacement:**
```typescript
$VARIABLE ?? $DEFAULT
```

**Examples:**

*Null coalescing conversion*

Before:
```typescript
const value = input || 'default';
```

After:
```typescript
const value = input ?? 'default';
```

---

### Destructuring Opportunity

Convert multiple property access to destructuring

**Complexity:** 4/10

**Risk Level:** medium

**Pattern:**
```typescript
const $VAR1 = $OBJECT.$PROP1;\nconst $VAR2 = $OBJECT.$PROP2;
```

**Replacement:**
```typescript
const { $PROP1: $VAR1, $PROP2: $VAR2 } = $OBJECT;
```

**Examples:**

*Basic destructuring opportunity*

Before:
```typescript
const name = user.name;
const age = user.age;
```

After:
```typescript
const { name, age } = user;
```

---

### Optional Chaining Opportunity

Use optional chaining instead of guard checks

**Complexity:** 3/10

**Risk Level:** medium

**Pattern:**
```typescript
$OBJECT && $OBJECT.$PROPERTY
```

**Replacement:**
```typescript
$OBJECT?.$PROPERTY
```

**Examples:**

*Nested optional chaining*

Before:
```typescript
user && user.profile && user.profile.name
```

After:
```typescript
user?.profile?.name
```

---

## Safety

### Strict Equality Comprehensive

Convert loose equality to strict equality

**Complexity:** 1/10

**Risk Level:** low

**Pattern:**
```typescript
$LEFT == $RIGHT
```

**Replacement:**
```typescript
$LEFT === $RIGHT
```

**Examples:**

*Basic equality check*

Before:
```typescript
if (a == b) return true;
```

After:
```typescript
if (a === b) return true;
```

---

### Strict Inequality Comprehensive

Convert loose inequality to strict inequality

**Complexity:** 1/10

**Risk Level:** low

**Pattern:**
```typescript
$LEFT != $RIGHT
```

**Replacement:**
```typescript
$LEFT !== $RIGHT
```

**Examples:**

*Basic inequality check*

Before:
```typescript
if (a != null) return true;
```

After:
```typescript
if (a !== null) return true;
```

---

### Const To Let Loops

Fix const loop variables that need reassignment

**Complexity:** 2/10

**Risk Level:** medium

**Pattern:**
```typescript
for (const $VARIABLE = $INIT; $CONDITION; $UPDATE)
```

**Replacement:**
```typescript
for (let $VARIABLE = $INIT; $CONDITION; $UPDATE)
```

**Examples:**

*Basic for loop with const variable*

Before:
```typescript
for (const i = 0; i < 10; i++) { console.log(i); }
```

After:
```typescript
for (let i = 0; i < 10; i++) { console.log(i); }
```

---

## Optimization

### Object Shorthand Enhanced

Use object property shorthand syntax

**Complexity:** 1/10

**Risk Level:** low

**Pattern:**
```typescript
{ $KEY: $KEY }
```

**Replacement:**
```typescript
{ $KEY }
```

**Examples:**

*Multiple property shorthand*

Before:
```typescript
const obj = { name: name, age: age };
```

After:
```typescript
const obj = { name, age };
```

---

### Arrow Function Optimization

Remove unnecessary return from arrow functions

**Complexity:** 2/10

**Risk Level:** low

**Pattern:**
```typescript
($PARAMS) => { return $EXPRESSION; }
```

**Replacement:**
```typescript
($PARAMS) => $EXPRESSION
```

**Examples:**

*Simple expression return*

Before:
```typescript
const double = (x) => { return x * 2; };
```

After:
```typescript
const double = (x) => x * 2;
```

---

## Logging

### Console Error Conversion

Convert console.log to console.error for error messages

**Complexity:** 2/10

**Risk Level:** low

**Pattern:**
```typescript
console.log($ERROR_MSG)
```

**Replacement:**
```typescript
console.error($ERROR_MSG)
```

**Examples:**

*Error message detection*

Before:
```typescript
console.log('Error: something went wrong');
```

After:
```typescript
console.error('Error: something went wrong');
```

---

