const fs = require('fs');
const path = require('path');

function loadKeys(filePath) {
  try {
    const data = fs.readFileSync(filePath, 'utf8');
    const json = JSON.parse(data);
    const keys = new Set();

    function recurse(obj, prefix = '') {
      for (const [k, v] of Object.entries(obj)) {
        const full = prefix ? `${prefix}.${k}` : k;
        if (v && typeof v === 'object') {
          recurse(v, full);
        } else {
          keys.add(full);
        }
      }
    }
    recurse(json);
    return keys;
  } catch (error) {
    console.warn(`Could not load translation file: ${filePath}`);
    return new Set();
  }
}

// Load translations once at module level for performance
const langs = {
  German: loadKeys(path.join(process.cwd(), 'src/translations/languages/de.json')),
  French: loadKeys(path.join(process.cwd(), 'src/translations/languages/fr.json')),
  Italian: loadKeys(path.join(process.cwd(), 'src/translations/languages/it.json')),
};

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Ensure translation keys exist in DE/FR/IT',
      category: 'Possible Errors',
    },
    schema: [],
    messages: {
      missingTranslation: 'Translation key "{{key}}" missing in: {{languages}}',
      invalidKey: 'Translation key "{{key}}" not found in any translation file',
    },
  },

  create(context) {
    return {
      CallExpression(node) {
        if (
          node.callee.name === 'translate' &&
          node.arguments.length >= 2 &&
          node.arguments[0].type === 'Literal' &&
          node.arguments[1].type === 'Literal'
        ) {
          const section = node.arguments[0].value;
          const key = node.arguments[1].value;
          const fullKey = `${section}.${key}`;

          const missing = Object.entries(langs)
            .filter(([, set]) => !set.has(fullKey))
            .map(([name]) => name);

          const reportData = { key: fullKey, languages: missing.join(', ') };
          if (missing.length === 3) {
            context.report({ node: node.arguments[1], messageId: 'invalidKey', data: reportData });
          } else if (missing.length > 0) {
            context.report({ node: node.arguments[1], messageId: 'missingTranslation', data: reportData });
          }
        }
      },
    };
  },
};
