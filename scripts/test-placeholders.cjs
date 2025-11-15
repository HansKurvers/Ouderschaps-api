/**
 * Test script for ouderschapsplan placeholder generation
 *
 * This script tests the newly added gezagZin, relatieAanvangZin, and ouderschapsplanDoelZin placeholders
 */

const { generateGezagZin, generateRelatieAanvangZin, generateOuderschapsplanDoelZin, generateAllPlaceholders } = require('../dist/utils/ouderschapsplan-text-generator');

console.log('🧪 Testing Ouderschapsplan Placeholder Generation\n');
console.log('='.repeat(80) + '\n');

// Test gezag zinnen
console.log('📝 Test 1: Gezag Zinnen\n');
console.log('Gezag code 1 (Gezamenlijk gezag):');
console.log(generateGezagZin(1, undefined, 'Jan de Vries', 'Maria Jansen'));
console.log('');

console.log('Gezag code 2 (Partij 1 alleen):');
console.log(generateGezagZin(2, undefined, 'Jan de Vries', 'Maria Jansen'));
console.log('');

console.log('Gezag code 3 (Partij 2 alleen):');
console.log(generateGezagZin(3, undefined, 'Jan de Vries', 'Maria Jansen'));
console.log('');

console.log('Gezag code 4 (Partij 1 voorlopig, binnen 12 weken gezamenlijk):');
console.log(generateGezagZin(4, 12, 'Jan de Vries', 'Maria Jansen'));
console.log('');

console.log('Gezag code 5 (Partij 2 voorlopig, binnen 8 weken gezamenlijk):');
console.log(generateGezagZin(5, 8, 'Jan de Vries', 'Maria Jansen'));
console.log('');

console.log('Geen gezag info:');
console.log(generateGezagZin(undefined, undefined));
console.log('');

console.log('\n' + '='.repeat(80) + '\n');

// Test relatie aanvang zinnen
console.log('📝 Test 2: Relatie Aanvang Zinnen\n');

console.log('Huwelijk met datum en plaats:');
console.log(generateRelatieAanvangZin(
    new Date('2015-05-15'),
    'Amsterdam',
    'Huwelijk'
));
console.log('');

console.log('Geregistreerd partnerschap met datum:');
console.log(generateRelatieAanvangZin(
    new Date('2018-03-22'),
    undefined,
    'Geregistreerd partnerschap'
));
console.log('');

console.log('Samenwonen met plaats:');
console.log(generateRelatieAanvangZin(
    undefined,
    'Rotterdam',
    'Samenwonen'
));
console.log('');

console.log('Alleen datum (geen type):');
console.log(generateRelatieAanvangZin(
    new Date('2020-01-10'),
    undefined,
    undefined
));
console.log('');

console.log('Geen informatie:');
console.log(generateRelatieAanvangZin(undefined, undefined, undefined));
console.log('');

console.log('\n' + '='.repeat(80) + '\n');

// Test ouderschapsplan doel zinnen
console.log('📝 Test 3: Ouderschapsplan Doel Zinnen\n');

console.log('Huwelijk (scheiden):');
console.log(generateOuderschapsplanDoelZin('Huwelijk'));
console.log('');

console.log('Geregistreerd partnerschap (scheiden):');
console.log(generateOuderschapsplanDoelZin('Geregistreerd partnerschap'));
console.log('');

console.log('Samenwonen (uit elkaar gaan):');
console.log(generateOuderschapsplanDoelZin('Samenwonen'));
console.log('');

console.log('Andere relatie (uit elkaar gaan):');
console.log(generateOuderschapsplanDoelZin('Anders'));
console.log('');

console.log('Geen relatie info (uit elkaar gaan):');
console.log(generateOuderschapsplanDoelZin(undefined));
console.log('');

console.log('\n' + '='.repeat(80) + '\n');

// Test all placeholders together
console.log('📝 Test 4: Alle Placeholders Samen\n');

const testInfo = {
    gezagPartij: 1,
    gezagTermijnWeken: undefined,
    datumAanvangRelatie: new Date('2012-07-20'),
    plaatsRelatie: 'Utrecht',
    soortRelatie: 'Huwelijk'
};

const placeholders = generateAllPlaceholders(
    testInfo,
    'Peter van der Berg',
    'Sophie Bakker'
);

console.log('Voor een huwelijk met gezamenlijk gezag:');
console.log('- gezagZin:', placeholders.gezagZin);
console.log('- relatieAanvangZin:', placeholders.relatieAanvangZin);
console.log('- ouderschapsplanDoelZin:', placeholders.ouderschapsplanDoelZin);
console.log('');

console.log('\n' + '='.repeat(80) + '\n');

// Test for samenwonen
console.log('📝 Test 5: Samenwonen Scenario\n');

const testInfo2 = {
    gezagPartij: 1,
    gezagTermijnWeken: undefined,
    datumAanvangRelatie: new Date('2018-03-15'),
    plaatsRelatie: 'Rotterdam',
    soortRelatie: 'Samenwonen'
};

const placeholders2 = generateAllPlaceholders(
    testInfo2,
    'Lisa Vermeulen',
    'Tom de Jong'
);

console.log('Voor samenwonen met gezamenlijk gezag:');
console.log('- gezagZin:', placeholders2.gezagZin);
console.log('- relatieAanvangZin:', placeholders2.relatieAanvangZin);
console.log('- ouderschapsplanDoelZin:', placeholders2.ouderschapsplanDoelZin);
console.log('');

console.log('\n' + '='.repeat(80) + '\n');
console.log('✅ Alle tests voltooid!\n');
console.log('Deze zinnen kunnen nu als placeholders gebruikt worden in ouderschapsplan-document-generator');
console.log('met de volgende placeholder namen:');
console.log('  - [[GezagZin]]');
console.log('  - [[RelatieAanvangZin]]');
console.log('  - [[OuderschapsplanDoelZin]]');
console.log('');
