A Tic-tac-toe game, including step-by-step guide for how it was built.

If you are new to the MRE SDK, welcome! It's fun and (relatively)
easy to get started building your own MREs. But before you try to go 
through this tutorial, please first try to build and deploy the Hello 
World sample.

To go through the tutorial, look at the tutorial-steps folder. It 
contains a subfolder for each step, including the app.ts for that 
step, as well as a link to a side-by-side comparison of the folder
before and after the step.

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

* `npm run debug-watch`
* Switch to the VSCode debugger panel using the icon at the far left of VSCode that looks like a little bug over a Play button
* Select `Attach to tic-tac-toe project` from the dropdown at the top of the debugger panel
* Click the green triangular play button next to the dropdown to attach the debugger 
* Switch back to the VSCode file list panel using the files icon at the top left of VSCode
* Open `app.ts` in VSCode
* Click in the left margin of the editor to set a red breakpoint on the line that starts `this.text = Actor.Create(` (currently that's line 98 but the line number might have changed somewhat by the time you read this)
* Find the line `this.text.text.contents = "Tic-Tac-Toe\nClick To Play";` near the bottom of the file and change it to `this.text.text.contents = "Hello Tic-Tac-Toe\nClick To Play";`
* Save the file
* Watch how the changes to your code are automatically detected, reloaded into your AltspaceVR world, and the VSCode debugger pauses the execution of your code at the breakpoint line so you can step through your code to make sure everything is working the way you want (if the debugger doesn't stop at the breakpoint line, it's possible you need to increase the timeout from 1000 milliseconds = 1 second to 2000 or 3000 milliseconds to give the debugger time to attach properly on your computer)
* Press the blue debugger play button at the top of the text editor to continue running your code
* See the spinning text in your AltspaceVR world change respond to your code changes
