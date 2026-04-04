Torn Chain Tracker — Installation Guide,
A real-time faction chain queue tool. Coordinates who attacks next during a chain, syncs live across all members.

-----

PC (Tampermonkey),
Requirements: The Tampermonkey browser extension installed in Chrome, Firefox, or Edge.

Go to the GitHub repository and open tornPC.js,
Click the Raw button to view the raw code,
Select all the code and copy it,
Open Tampermonkey in your browser → click the extension icon → Create a new script,
Delete any existing placeholder code in the editor,
Paste the copied code and click Save (Ctrl+S),
Navigate to any torn.com page — the Chain Tracker tab will appear on the right edge of the screen,
On first load it will ask for your Torn API key — use a Minimal access key from your Torn API preferences,

The key is saved locally in your browser and never shared.

-----

TornPDA (Mobile),
Requirements: TornPDA app installed on your phone with your Torn account connected.

Go to the GitHub repository and open tornPDA.js,
Click the Raw button to view the raw code,
Select all the code and copy it,
In TornPDA, open the hamburger menu (top left) → Advanced browser settings → Manage scripts,
Tap the + button to add a new script,
Paste the copied code into the source code field,
Give it a name (e.g. Chain Tracker) and tap Save,
Navigate to any Torn page in TornPDA — the Chain Tracker button will appear on the right edge,

No API key needed — TornPDA automatically provides your key to the script.

-----

Usage,
Tap the Chain Tracker button to open the panel,
Tap Claim slot to add yourself to the queue,
You can tap Mark done after you’ve made your hit, or it will auto mark that number as done after the hit reads
The queue syncs live across all members — everyone sees the same order in real time,
An alert fires when the chain timer drops below 45 seconds.
This is not perfect, there is a few seconds delay as the API polls every 15 seconds and can take that long for the time to catch up to the real time (sometimes still a few seconds off).

-----

Built by LordGraham (and a few drops of AI)
