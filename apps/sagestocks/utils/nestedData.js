/**
 * Utilities for handling nested data structures
 */

/**
 * Get a nested value from an object using dot notation
 * @param {object} obj - The object to query
 * @param {string} path - Dot-notation path (e.g., "scores.composite")
 * @returns {*} The value at the path, or undefined if not found
 */
export function getNestedValue(obj, path) {
  if (!obj || !path) return undefined;
  
  const keys = path.split('.');
  let current = obj;
  
  for (const key of keys) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = current[key];
  }
  
  return current;
}

/**
 * Auto-generate field configurations from sample data
 * @param {object} sampleData - A sample data object
 * @param {string} prefix - Path prefix for nested objects
 * @param {number} depth - Current recursion depth
 * @param {Set<any>} seen - Set of seen objects to detect circular references
 * @returns {Array<object>} Array of field configurations
 */
export function generateFieldsFromData(sampleData, prefix = '', depth = 0, seen = new Set()) {
  const fields = [];
  
  // Limit recursion depth to prevent stack overflow
  const MAX_DEPTH = 3;
  if (depth > MAX_DEPTH) {
    return fields;
  }
  
  if (!sampleData || typeof sampleData !== 'object') {
    return fields;
  }
  
  // Detect circular references
  if (seen.has(sampleData)) {
    return fields;
  }
  seen.add(sampleData);
  
  for (const [key, value] of Object.entries(sampleData)) {
    const fullPath = prefix ? `${prefix}.${key}` : key;
    
    // Skip id field
    if (key === 'id') {
      continue;
    }
    
    // Skip private/internal fields (those starting with _)
    if (key.startsWith('_')) {
      continue;
    }
    
    // Handle Firestore Timestamps (has toDate method or seconds/nanoseconds)
    if (value && typeof value === 'object') {
      const isTimestamp = (
        typeof value.toDate === 'function' ||
        (value.seconds !== undefined && value.nanoseconds !== undefined)
      );
      
      if (isTimestamp) {
        // Use timeAgo for createdAt/updatedAt, date for others
        const isTimeAgoField = key === 'createdAt' || key === 'updatedAt';
        fields.push({
          id: fullPath.replace(/\./g, '_'),
          label: key === 'createdAt' ? 'Ran' : formatLabel(fullPath),
          fieldName: fullPath,
          fieldType: isTimeAgoField ? 'timeAgo' : 'date',
          width: isTimeAgoField ? 90 : 150,
          visible: false,
          sortable: true,
          filterable: true,
        });
        continue;
      }
      
      // Skip functions, DOM nodes, etc.
      if (typeof value === 'function' || value instanceof Node) {
        continue;
      }
    }
    
    // Handle nested plain objects (not arrays)
    if (value && typeof value === 'object' && !Array.isArray(value) && Object.prototype.toString.call(value) === '[object Object]') {
      // Only recurse if it's a plain object with own properties
      const ownKeys = Object.keys(value);
      if (ownKeys.length > 0 && ownKeys.length < 50) { // Don't recurse into huge objects
        fields.push(...generateFieldsFromData(value, fullPath, depth + 1, seen));
      } else {
        // Treat as opaque object
        fields.push({
          id: fullPath.replace(/\./g, '_'),
          label: formatLabel(fullPath),
          fieldName: fullPath,
          fieldType: 'text',
          width: 200,
          visible: false,
          sortable: false,
          filterable: false,
        });
      }
    } else {
      // Determine field type
      let fieldType = 'text';
      if (typeof value === 'number') {
        fieldType = 'number';
      } else if (typeof value === 'boolean') {
        fieldType = 'badge';
      } else if (Array.isArray(value)) {
        fieldType = 'multiSelect';
      }
      
      fields.push({
        id: fullPath.replace(/\./g, '_'),
        label: formatLabel(fullPath),
        fieldName: fullPath,
        fieldType,
        width: 150,
        visible: false, // Start hidden, user can enable
        sortable: true,
        filterable: true,
      });
    }
  }
  
  return fields;
}

/**
 * Format a field path into a human-readable label
 * @param {string} path - Dot-notation path
 * @returns {string} Formatted label
 */
function formatLabel(path) {
  return path
    .split('.')
    .map(part => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' > ');
}

