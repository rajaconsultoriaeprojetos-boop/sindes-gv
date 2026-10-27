export function digitosCpf(valor: string): string {
  return valor.replace(/\D/g, "").slice(0, 11);
}

export function formatarCpfDigitando(valor: string): string {
  const digitos = digitosCpf(valor);
  const parte1 = digitos.slice(0, 3);
  const parte2 = digitos.slice(3, 6);
  const parte3 = digitos.slice(6, 9);
  const parte4 = digitos.slice(9, 11);
  if (digitos.length <= 3) return parte1;
  if (digitos.length <= 6) return `${parte1}.${parte2}`;
  if (digitos.length <= 9) return `${parte1}.${parte2}.${parte3}`;
  return `${parte1}.${parte2}.${parte3}-${parte4}`;
}

export function ocultarCpf(digitos: string): string {
  const limpos = digitos.replace(/\D/g, "");
  const fim = limpos.slice(-2).padStart(2, "*");
  return `***.***.***-${fim}`;
}

export function cpfValido(valor: string): boolean {
  const digitos = digitosCpf(valor);
  if (!/^\d{11}$/.test(digitos)) return false;
  if (/^(\d)\1{10}$/.test(digitos)) return false;
  const nums = digitos.split("").map(Number);
  let soma = 0;
  for (let i = 0; i < 9; i += 1) soma += nums[i] * (10 - i);
  let resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  if (resto !== nums[9]) return false;
  soma = 0;
  for (let i = 0; i < 10; i += 1) soma += nums[i] * (11 - i);
  resto = (soma * 10) % 11;
  if (resto === 10) resto = 0;
  return resto === nums[10];
}
