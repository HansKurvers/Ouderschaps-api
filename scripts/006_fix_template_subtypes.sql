-- =============================================
-- Migration: Fix template subtypes to match frontend
-- Description: Update subtypes to match what frontend is using
-- Date: 2025-11-12
-- =============================================

PRINT 'Updating template subtypes to match frontend implementation...';

-- Update verjaardag_kinderen to verjaardag_kind
UPDATE dbo.regelingen_templates
SET template_subtype = 'verjaardag_kind'
WHERE template_subtype = 'verjaardag_kinderen';

-- Update verjaardag_ouders to verjaardag_partij1
UPDATE dbo.regelingen_templates
SET template_subtype = 'verjaardag_partij1'
WHERE template_subtype = 'verjaardag_ouders';

-- Update verjaardag_grootouders to verjaardag_partij2
UPDATE dbo.regelingen_templates
SET template_subtype = 'verjaardag_partij2'
WHERE template_subtype = 'verjaardag_grootouders';

-- Update bijzondere_jubilea to bijzonder_jubileum
UPDATE dbo.regelingen_templates
SET template_subtype = 'bijzonder_jubileum'
WHERE template_subtype = 'bijzondere_jubilea';

PRINT 'Template subtypes updated successfully.';

-- Verify the changes
PRINT '';
PRINT 'Current subtypes in database:';
SELECT DISTINCT 
    template_subtype,
    COUNT(*) as template_count
FROM dbo.regelingen_templates
WHERE template_subtype IS NOT NULL
GROUP BY template_subtype
ORDER BY template_subtype;

PRINT '';
PRINT '=== Migration Complete ===';
PRINT 'Subtypes now match frontend implementation:';
PRINT '  - verjaardag_kind (was: verjaardag_kinderen)';
PRINT '  - verjaardag_partij1 (was: verjaardag_ouders)';
PRINT '  - verjaardag_partij2 (was: verjaardag_grootouders)';
PRINT '  - bijzonder_jubileum (was: bijzondere_jubilea)';
PRINT '';