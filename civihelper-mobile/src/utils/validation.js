// Validaciones reutilizables y "tests" rápidos con console.assert.
// ISO 25010: usabilidad (mensajes claros), seguridad básica en cliente.

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).trim());
}

export function validatePassword(pwd) {
  const errors = [];
  if (!pwd || pwd.length < 8) errors.push("Mínimo 8 caracteres");
  if (!/[a-z]/.test(pwd)) errors.push("Una minúscula");
  if (!/[A-Z]/.test(pwd)) errors.push("Una mayúscula");
  if (!/[0-9]/.test(pwd)) errors.push("Un número");
  if (!/[^\w\s]/.test(pwd)) errors.push("Un símbolo");
  return { valid: errors.length === 0, errors };
}

// "Test cases" mínimos (se ejecutan una vez en dev)
let _ran = false;
export function runValidationTestsOnce() {
  if (_ran) return; _ran = true;
  console.assert(validateEmail("a@b.com") === true, "Email válido debería ser true");
  console.assert(validateEmail("a@b") === false, "Email inválido debería ser false");

  const ok = validatePassword("Aa1!aaaa");
  console.assert(ok.valid === true, "Password fuerte debería ser válido");

  const bad = validatePassword("short");
  console.assert(bad.valid === false && bad.errors.length > 0, "Password débil debería fallar");
}
