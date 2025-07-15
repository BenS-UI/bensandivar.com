import { isObject, isArray, isEqual } from 'lodash-es';

export interface Difference {
  path: string;
  oldValue: any;
  newValue: any;
}

export function findDifferences(
  original: any,
  current: any,
  path: string = ''
): Difference[] {
  let differences: Difference[] = [];
  
  if (!isObject(original) || !isObject(current)) {
    if (!isEqual(original, current)) {
      return [{ path, oldValue: original, newValue: current }];
    }
    return [];
  }

  const allKeys = new Set([...Object.keys(original), ...Object.keys(current)]);

  for (const key of allKeys) {
    const currentPath = path ? `${path}.${key}` : key;
    const originalValue = original[key];
    const currentValue = current[key];

    if (!isEqual(originalValue, currentValue)) {
      if (isObject(originalValue) && isObject(currentValue) && !isArray(originalValue) && !isArray(currentValue)) {
        differences = differences.concat(
          findDifferences(originalValue, currentValue, currentPath)
        );
      } else {
        differences.push({
          path: currentPath,
          oldValue: originalValue,
          newValue: currentValue,
        });
      }
    }
  }

  return differences;
}
