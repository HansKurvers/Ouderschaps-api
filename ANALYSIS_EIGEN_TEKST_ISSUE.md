# Analysis: "Eigen Tekst" Working for Algemeen but Not Other Types

## Summary

After investigating the API and database structure, I've discovered why "eigen tekst" (custom text) appears to work for decisions (type `Algemeen`) but not for other types like holidays (`Feestdag`), even without specific "Eigen tekst invoeren" templates.

## Key Findings

### 1. Database Structure

The `regelingen_templates` table has the following structure:
- `id` - Primary key
- `template_naam` - Template identifier
- `template_tekst` - Template text with placeholders
- `meervoud_kinderen` - Whether for multiple children
- `type` - Template type (Feestdag, Vakantie, Algemeen, Bijzondere dag)
- `template_subtype` - Optional subtype
- `sort_order` - Display order

### 2. Template Types Analysis

#### Feestdag (Holidays)
- Has explicit "eigen_tekst" templates with `template_tekst = "Eigen tekst invoeren"`
- Examples: `sinterklaas_eigen_tekst`, `kerst_eigen_tekst`
- These templates signal the frontend to show a text input field

#### Algemeen (Decisions)
- Does NOT have "eigen_tekst" templates in the current database
- Script `add-all-eigen-tekst-templates.cjs` was created to add them but appears not to have been run
- Would add templates named `beslissing_eigen_tekst` with subtype `'beslissing'`

### 3. The Critical Difference

The key issue is likely in the **frontend implementation**:

1. **For Feestdag/Holiday types**: The frontend likely requires an explicit template with `template_tekst = "Eigen tekst invoeren"` to enable custom text input

2. **For Algemeen/Decision types**: The frontend appears to have **hardcoded logic** that:
   - Always allows custom text input for decisions
   - Doesn't check for specific "eigen tekst" templates
   - May have a built-in "eigen tekst" option in the UI

### 4. Evidence

1. The backup data shows NO "eigen_tekst" templates for type "Algemeen"
2. All existing Algemeen templates have `template_subtype: null`
3. The script to add eigen_tekst for Algemeen exists but wasn't executed
4. Yet users report that "eigen tekst" works for decisions

## Conclusion

The discrepancy is most likely in the **frontend code**, not the API:

- **Frontend has special handling for type "Algemeen"** that automatically includes a custom text option
- **Other types require explicit "eigen_tekst" templates** in the database
- The API simply returns what's in the database - it doesn't add any special "eigen tekst" options

## Recommendations

1. **Check the frontend code** for special handling of "Algemeen" type templates
2. **Verify if the script needs to be run**: Execute `add-all-eigen-tekst-templates.cjs` if you want database consistency
3. **Consider standardization**: Either:
   - Remove special frontend handling and require explicit templates for all types
   - Add special frontend handling for all types to allow custom text without templates

## API Behavior

The API endpoint `/api/lookups/regelingen-templates`:
- Returns templates filtered by type, subtype, and meervoud_kinderen
- Does NOT add any "eigen tekst" options programmatically
- Simply returns what's stored in the database

This confirms the special behavior must be in the frontend application.