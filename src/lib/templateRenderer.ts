function getVariableValue(source: Record<string, any>, path: string): any {
  const keys = path.split('.').filter(Boolean);
  let current: any = source;

  for (const key of keys) {
    if (current == null || typeof current !== 'object' || !(key in current)) {
      return '';
    }
    current = current[key];
  }

  if (current === null || current === undefined) {
    return '';
  }

  return current;
}

export function renderTemplate(content: string, variables: Record<string, any>): string {
  if (!content) {
    return '';
  }

  return content.replace(/{{\s*([^{}\s]+)\s*}}/g, (_, variableName: string) => {
    const value = getVariableValue(variables || {}, variableName.trim());

    if (typeof value === 'string') {
      return value;
    }

    if (typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }

    return '';
  });
}
