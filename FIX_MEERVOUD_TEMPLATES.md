# Fix Meervoud Templates

## Issue
Templates with `meervoudKinderen=true` were using singular placeholders and verbs:
- Using `{KIND}` instead of `{KINDEREN}` 
- Using singular verbs like "verblijft" instead of plural "verblijven"

## Solution
Created script `scripts/fix-meervoud-templates.cjs` that:
1. Finds all templates with `meervoudKinderen=true` 
2. Replaces `{KIND}` with `{KINDEREN}`
3. Fixes verb conjugations for plural forms

## Changes Made
- Updated 28 templates across 3 types:
  - Bijzondere dag: 14 templates
  - Feestdag: 7 templates  
  - Vakantie: 7 templates

## Examples
Before: "Op {FEESTDAG} verblijft {KIND} bij {PARTIJ1}."
After: "Op {FEESTDAG} verblijven {KINDEREN} bij {PARTIJ1}."

Before: "{KIND} mogen op de verjaardag van beide ouders op bezoek komen."
After: "{KINDEREN} mogen op de verjaardag van beide ouders op bezoek komen."