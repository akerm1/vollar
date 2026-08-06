<#


.SYNOPSIS
Replaces the caisse section in index.html with a modernized version
#>

$indexPath = "index.html"
$modernSectionPath = "modern_caisse_section.html"

# Read the files
$content = Get-Content $indexPath -Raw
$newSection = Get-Content $modernSectionPath -Raw

# Find the section boundaries
$startMarker = "<!-- ==== SECTION 10: CAISSE"
$endMarker = "<!-- ==== SECTION 11:"

$startIndex = $content.IndexOf($startMarker)
if ($startIndex -lt 0) {
    Write-Error "Could not find start of caisse section"
    exit 1
}

$endIndex = $content.IndexOf($endMarker, $startIndex)
if ($endIndex -lt $startIndex) {
    Write-Error "Could not find end of caisse section"
    exit 1
}

# Calculate the end of the current section
$sectionEnd = $content.IndexOf("`n", $endIndex)
if ($sectionEnd -lt $endIndex) {
    $sectionEnd = $endIndex
}

# Replace the section
$newContent = $content.Substring(0, $startIndex) + $newSection + $content.Substring($sectionEnd)

# Write the result
[System.IO.File]::WriteAllText($indexPath, $newContent)
Write-Output "Successfully replaced caisse section in index.html"