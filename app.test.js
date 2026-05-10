const { add, subtract, multiply, divide } = require("./app");

test("adds 2 + 3 = 5",          () => expect(add(2, 3)).toBe(5));
test("subtracts 5 - 2 = 3",     () => expect(subtract(5, 2)).toBe(3));
test("multiplies 3 * 4 = 12",   () => expect(multiply(3, 4)).toBe(12));
test("divides 10 / 2 = 5",      () => expect(divide(10, 2)).toBe(5));
test("throws on divide by zero", () => expect(() => divide(5, 0)).toThrow("Cannot divide by zero"));
