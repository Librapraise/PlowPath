const fs = require('fs');
const path = require('path');

// Read and parse the .env file in the mobile directory
const envPath = path.resolve(__dirname, '.env');
const env = {};
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      let val = parts.slice(1).join('=').trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
}

module.exports = {
  presets: ['module:metro-react-native-babel-preset'],
  plugins: [
    [
      function inlineEnvironmentVariables({ types: t }) {
        return {
          name: 'inline-environment-variables',
          visitor: {
            MemberExpression(path) {
              if (
                path.get('object').matchesPattern('process.env') &&
                t.isIdentifier(path.node.property)
              ) {
                const key = path.node.property.name;
                const value = env[key] ?? process.env[key];
                if (value !== undefined) {
                  path.replaceWith(t.valueToNode(value));
                }
              }
            },
          },
        };
      },
    ],
  ],
};

