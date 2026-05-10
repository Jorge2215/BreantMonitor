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

##Deploy a Azure
Resource Group: brent-spread-monitor-rg
Static Web App: brent-spread-monitor-swa
Subscription ID: bb5ffe61-553c-4019-a657-79878bed7e08
Github Org: Jorge2215
Github Repo: https://github.com/Jorge2215/BreantMonitor
Rama: main
Action: ejecutar el deploy cada vez que se ejecute un pull request and merge en la rama "main"

Context:
We need to configure continuous deployment for an Azure Static Web App named "brent-spread-monitor-swa" 
located in the resource group "brent-spread-monitor-rg" under subscription ID "bb5ffe61-553c-4019-a657-79878bed7e08". 
The project repository is hosted on GitHub under the organization "Jorge2215" and the repository 
"https://github.com/Jorge2215/BreantMonitor". The deployment must be triggered automatically 
whenever a pull request is merged into the "main" branch.

Goal:
Create a GitHub Actions workflow file that builds and deploys the Static Web App to Azure 
using the Deployment Token. The workflow should ensure that the app is compiled correctly 
and published to the designated Azure Static Web App resource.

Instructions:
- Create a workflow YAML file under .github/workflows/ (e.g., azure-static-web-apps.yml).
- Configure the workflow to trigger only when a pull request is merged into the "main" branch.
- Use the official Azure/static-web-apps-deploy@v1 action.
- Reference the GitHub secret AZURE_STATIC_WEB_APPS_API_TOKEN for authentication.
- Set app_location to the root folder (".") and output_location to the build output folder (e.g., "dist").
- Ensure the workflow validates pull requests before merge and deploys only after merge.
- Keep the workflow minimal, clean, and easy to maintain.

Output:
Provide the complete GitHub Actions workflow YAML file, 
ready to be placed in the .github/workflows/ directory of the repository.
Include comments explaining each section of the workflow.

## Actualizacion de archivos JSON con series historicas de datos

Context:
We have a Static Web App that currently reads data from two JSON files:
1. raw.json → contains historical series of contract values (sales contracts).
2. dated-brent.json → contains historical Brent Oil price quotations.

Goal:
Develop one or two web pages (depending on practicality) that allow the user to edit and update these JSON files directly from the dashboard interface. 
The purpose is to keep both historical series updated without manually editing files in the repository.

Requirements:
- Provide a clear, user-friendly interface for editing JSON data.
- Support basic CRUD operations (Create, Read, Update, Delete) on entries.
- Ensure validation of input fields (e.g., date format, numeric values).
- Display the current JSON data in a structured table or form.
- Allow saving changes back to the JSON files in the /Data folder.
- Preserve the existing layout and design style of the dashboard.
- Include comments in the code explaining how the JSON update logic works.

Technical Notes:
- Use JavaScript (or a framework already in use in the project) to fetch and update the JSON files.
- Ensure that updates are reflected immediately in the Static Web App after saving.
- Consider separating the two editors (one for raw.json, one for dated-brent.json) if it simplifies usability.
- Keep the solution modular and maintainable for future extensions.

Output:
Provide the HTML, CSS, and JavaScript code for the update page(s).
Include explanatory comments and ensure the solution is easy to integrate into the existing dashboard.





##Resume Session
copilot --resume=f4de3bca-3e56-48d2-8b72-4aed69d355b2

##Probar la web localmente
Probar la web con npx serve

##
Obtener secret de Static Web App
az staticwebapp secrets list --name brent-spread-monitor-swa --query "properties.apiKey"

## Token para acceso desde el editor al repo de Github
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

## Uso de la App en Azure
Pagina Principal:  https://proud-plant-02f07951e.7.azurestaticapps.net/login
Pagina de Edicion: https://proud-plant-02f07951e.7.azurestaticapps.net/editor.html
(Tambien se accede mediante link a la pagina principa)
