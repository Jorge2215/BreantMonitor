At the moment the page "Index.html" shows information about Brent Oil Price.
The values are "hardcoded" within the page. Values are contained on cards with names from CO1 to CO10.
I created a JSON file with name "raw.json" on folder \Data. The file contains the values for each of these variables, for specific dates.
The goal for our team is update the page "Index.html", eliminating the hardcoded values and adding logic (java script) to read the values from the JSON file.
Once this page update is done, we gonna publish the html page and the json file on an Azure Static Web App.

##Version Inicial
Context:
You are assisting in refactoring an HTML page ("Index.html") that currently displays Brent Oil Price information. 
The values are hardcoded directly into the page, contained within cards labeled CO1 to CO10. 
A JSON file named "raw.json" has been created in the \Data folder, containing the values for each variable across specific dates.

Goal:
Update the "Index.html" page to eliminate hardcoded values and implement JavaScript logic 
that dynamically reads the values from the JSON file. 
The design and aesthetics of the page must remain unchanged.

Instructions:
- Replace hardcoded values in the HTML with dynamic values loaded from "raw.json".
- Use JavaScript to fetch and parse the JSON file.
- Populate the cards (CO1 to CO10) with the corresponding values from the JSON.
- Ensure the solution is clean, modular, and easy to maintain.
- Preserve the original layout and visual style of the page.

Output:
Provide the updated HTML and JavaScript code. 
Include comments explaining the changes and how the JSON integration works.


##Separacion de estilo de la pagina INDEX

Context:
You are assisting in refactoring an HTML page ("Index.html") that currently contains a large inline <style> section 
with approximately 700 lines of CSS. The styles define design tokens, typography, and repeated rules for multiple elements.

Goal:
Separate the styles from the "Index.html" page and move them into an external file named "styles.css" 
to simplify maintenance and improve readability. While doing this, evaluate opportunities to reduce redundant CSS rules 
and replace repeated patterns with reusable classes.

Instructions:
- Extract all CSS from the <style> section and place it into "styles.css".
- Update "Index.html" to reference the external stylesheet using <link rel="stylesheet" href="styles.css">.
- Identify repeated rules (e.g., similar card styles for CO1–CO10) and consolidate them into reusable classes.
- Keep the design tokens defined in :root for consistency.
- Ensure the visual layout and aesthetics remain unchanged after refactoring.

Output:
Provide the updated "Index.html" with the external stylesheet reference, 
and the simplified "styles.css" file with consolidated rules and comments explaining the changes.

##Separacion de codigo JScript
Context:
You are assisting in refactoring an HTML page ("Index.html") that currently contains inline JavaScript code 
embedded within <script> tags. The logic handles dynamic data loading and rendering.

Goal:
Move all JavaScript code from "Index.html" into an external file named "script.js" 
to improve maintainability, readability, and performance. While doing this, evaluate opportunities 
to simplify the JavaScript logic by consolidating repeated functions and using loops for dynamic content generation.

Instructions:
- Extract all JavaScript from "Index.html" and place it into "script.js".
- Update "Index.html" to reference the external file using <script src="script.js"></script>.
- Ensure that relative paths (e.g., ./Data/raw.json) remain correct.
- Simplify redundant code by consolidating functions and using reusable logic.
- Keep the visual layout and functionality unchanged after refactoring.

Output:
Provide the updated "Index.html" with the external script reference, 
and the new "script.js" file with simplified, modular JavaScript code and comments explaining the changes.


##Resume Session
copilot --resume=f4de3bca-3e56-48d2-8b72-4aed69d355b2

##Probar la web localmente
Probar la web con npx serve