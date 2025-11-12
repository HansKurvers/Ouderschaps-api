// Add this logging to the upsertOuderschapsplanInfo function to debug what the frontend sends
// You can temporarily add this to src/functions/ouderschapsplan/upsertOuderschapsplanInfo.ts

const debugCode = `
// Add this after line 38 where body is parsed
console.log('=== DEBUG: Received ouderschapsplan update request ===');
console.log('Dossier ID:', dossierId);
console.log('Request body:', JSON.stringify(body, null, 2));
console.log('gezagPartij value:', body.gezagPartij);
console.log('gezagPartij type:', typeof body.gezagPartij);
console.log('gezagPartij is undefined:', body.gezagPartij === undefined);
console.log('gezagPartij is null:', body.gezagPartij === null);

// Add this check to validate gezagPartij
if (body.gezagPartij !== undefined && (body.gezagPartij < 1 || body.gezagPartij > 5)) {
    console.error('Invalid gezagPartij value:', body.gezagPartij);
    return createErrorResponse('gezagPartij must be between 1 and 5', 400);
}

// Add this to ensure gezagPartij has a default value
if (body.gezagPartij === undefined) {
    console.warn('gezagPartij not provided, setting default to 1 (Gezamenlijk gezag)');
    body.gezagPartij = 1;
}
`;

console.log('Add this debug code to src/functions/ouderschapsplan/upsertOuderschapsplanInfo.ts after line 38:');
console.log(debugCode);

console.log('\n\nAlso add similar logging to updateOuderschapsplanInfo.ts after line 29:');

const updateDebugCode = `
// Add this after line 29 where body is parsed
console.log('=== DEBUG: Update ouderschapsplan info request ===');
console.log('Info ID:', infoId);
console.log('Request body:', JSON.stringify(body, null, 2));
console.log('gezagPartij value:', body.gezagPartij);
console.log('gezagPartij type:', typeof body.gezagPartij);
`;

console.log(updateDebugCode);