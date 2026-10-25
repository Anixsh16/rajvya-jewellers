export function safeReturnPath(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//') || /[\\\u0000-\u001f]/.test(value))
    return '/account';
  try {
    const url = new URL(value, 'https://rajvya.invalid');
    return url.origin === 'https://rajvya.invalid'
      ? url.pathname + url.search + url.hash
      : '/account';
  } catch {
    return '/account';
  }
}
