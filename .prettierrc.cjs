module.exports = {
    // Basic formatting
    semi: true,
    trailingComma: 'es5',
    singleQuote: true,

    // Indentation
    tabWidth: 4,
    useTabs: false,

    // Line length
    printWidth: 100,

    // Brackets
    bracketSpacing: true,
    bracketSameLine: false,

    // Arrows
    arrowParens: 'avoid',

    // Quotes
    quoteProps: 'as-needed',

    // Line endings
    endOfLine: 'lf',

    // Specific overrides for different file types
    overrides: [
        {
            files: '*.json',
            options: {
                tabWidth: 2,
            },
        },
        {
            files: '*.md',
            options: {
                tabWidth: 2,
                proseWrap: 'preserve',
            },
        },
        {
            files: '*.yml',
            options: {
                tabWidth: 2,
            },
        },
    ],
};
