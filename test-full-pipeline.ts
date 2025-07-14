// Test file to exercise the full Carmack Coder pipeline
// This file contains various patterns that should trigger different transformation modes

import { z } from 'zod';

// AST Pattern: Use loose equality (should trigger strict-equality)
function checkValue(a, b) {
    return a == b; // Should become a === b
}

// AST Pattern: Use loose inequality (should trigger strict-inequality) 
function isNotEqual(x, y) {
    return x != y; // Should become x !== y
}

// AST Pattern: Array indexOf (should trigger array-includes-instead-of-indexof)
function hasItem(arr, item) {
    return arr.indexOf(item) !== -1; // Should become arr.includes(item)
}

// AST Pattern: Object property verbose syntax (should trigger object-property-shorthand)
function createUser(name, email) {
    return { name: name, email: email }; // Should become { name, email }
}

// AST Pattern: String concatenation (should trigger template-literal-conversion)
function formatMessage(user, action) {
    return "User " + user + " performed " + action; // Should become template literal
}

// AST Pattern: Unnecessary return in arrow function (should trigger remove-unnecessary-returns)
const double = (x) => { return x * 2; }; // Should become (x) => x * 2

// AST Pattern: Promise.then chain (should trigger promise-to-async-await)
function fetchAndProcess(url) {
    return fetch(url).then((response) => { 
        return response.json(); 
    });
}

// AST Pattern: const in for loop (should trigger const-loop-variable-fix)
function processItems(items) {
    for (const i = 0; i < items.length; i++) { // Should become let i = 0
        console.log(items[i]);
    }
}

// Legacy class pattern (should trigger AST transformation to functional)
class UserManager {
    private users: any[] = [];
    
    addUser(user: any) {
        this.users.push(user);
    }
    
    getUser(id: any): any {
        return this.users.find(u => u.id === id);
    }
}

// Missing type safety (should trigger Zod schema addition)
function processUserData(data) {
    return {
        id: data.id,
        name: data.name,
        email: data.email
    };
}

// Imperative style (should trigger functional transformation)
function calculateTotal(items) {
    let total = 0;
    for (let i = 0; i < items.length; i++) {
        total += items[i].price;
    }
    return total;
}

// Missing error handling (should trigger error boundary addition)
async function fetchUserData(userId) {
    const response = await fetch(`/api/users/${userId}`);
    const data = await response.json();
    return data;
}

// Poor variable naming (should trigger renaming)
function proc(x, y) {
    const temp = x + y;
    const res = temp * 2;
    return res;
}

// Nested complexity (should trigger complexity reduction)
function complexFunction(input) {
    if (input) {
        if (input.type === 'user') {
            if (input.data) {
                if (input.data.id) {
                    return input.data.id;
                } else {
                    return null;
                }
            } else {
                return null;
            }
        } else {
            return null;
        }
    } else {
        return null;
    }
}

// Missing documentation
export function undocumentedFunction(param1, param2) {
    return param1 + param2;
}

// Export the problematic class for transformation
export { UserManager };
