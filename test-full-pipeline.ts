// Test file to exercise the full Carmack Coder pipeline
// This file contains various patterns that should trigger different transformation modes

import { z } from 'zod';

// Legacy class pattern (should trigger AST transformation to functional)
class UserManager {
  private users: any[] = [];

  addUser(user: any) {
    this.users.push(user);
  }

  getUser(id: any): any {
    return this.users.find((u) => u.id === id);
  }
}

// Missing type safety (should trigger Zod schema addition)
function processUserData(data) {
  return {
    id: data.id,
    name: data.name,
    email: data.email,
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
        }
        return null;
      }
      return null;
    }
    return null;
  }
  return null;
}

// Missing documentation
export function undocumentedFunction(param1, param2) {
  return param1 + param2;
}

// Export the problematic class for transformation
export { UserManager };
