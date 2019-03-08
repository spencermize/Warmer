module.exports = {
    "env": {
        "browser": true,
        "es6": true,
        "jquery": true,
        "mocha": true
    },
    "extends": ["standard","plugin:import/errors","plugin:import/warnings"],
    "parser": "babel-eslint",    
    "globals": {
        "Atomics": "readonly",
        "SharedArrayBuffer": "readonly"
    },
    "settings": {
        "import/resolver": "webpack"
    },
    "parserOptions": {
        "ecmaVersion": 2018,
        "allowImportExportEverywhere": true,
        "sourceType": "module"
    },
    "rules": {
        "no-console": 1,
        "indent": [2, "tab"],
        "semi": [2,"always"],
        "space-before-function-paren": [2,"never"],
        "spaced-comment": [2,"never"],
        "no-tabs": 0,
        "eqeqeq": 0,
        "no-unused-vars": [2,{"argsIgnorePattern": "^_"}],
        "space-before-blocks":[2,"never"],
        "comma-spacing":[2,{"before": false,"after": false}],
        "import/namespace":[2,{"allowComputed": true}]
    }
};