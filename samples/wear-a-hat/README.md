Displays a menu of hats that avatars can wear. Showcases avatar attachments.

## Setup

* Open this folder in VSCode
* `npm install`

## Run

* Open one of your worlds in AltspaceVR
* `npm run start`
* Open the world editor in AltspaceVR (only available if you indicate you want to participate in the Early Access Program in your Altspace VR settings)
* Add a `Basics` / `SDK App` object with a Target URI of `ws://127.0.0.1:3901`
* See the your object appear in your AltspaceVR world

## Debug

* `npm run debug`
* Switch to the VSCode debugger panel using the icon at the far left of VSCode that looks like a little bug over a Play button
* Select `Attach to wear-a-hat project` from the dropdown at the top of the debugger panel
* Click the green triangular play button next to the dropdown to attach the debugger 
* Switch back to the VSCode file list panel using the files icon at the top left of VSCode
* Open `app.ts` in VSCode
* Click in the left margin of the editor to set a red breakpoint on the line that starts `await this.preloadHats();` (currently that's line 99 but the line number might have changed somewhat by the time you read this)
* Find the line `contents: ''.padStart(8, ' ') + "Wear a Hat",` near the bottom of the file and change it to `contents: ''.padStart(8, ' ') + "Pick a Hat",`
* Save the file
* Watch how the changes to your code are automatically detected, reloaded into your AltspaceVR world, and the VSCode debugger pauses the execution of your code at the breakpoint line so you can step through your code to make sure everything is working the way you want (if the debugger doesn't stop at the breakpoint line, it's possible you need to increase the timeout from 1000 milliseconds = 1 second to 2000 or 3000 milliseconds to give the debugger time to attach properly on your computer)
* Press the blue debugger play button at the top of the text editor to continue running your code
* See the text in your AltspaceVR world change in response to your modified code

## Attribution

Hat models taken from a sample in the previous AltspaceVR SDK.
