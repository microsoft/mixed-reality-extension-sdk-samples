---
page_type: sample
name: Mixed Reality Extension SDK Samples
description: Samples showing how to build and run your first AltspaceVR extension using the Mixed Reality Extension SDK.
languages:
- javascript
products:
- windows-mixed-reality
- hololens
---

# Mixed Reality Extension SDK Samples

<img width='200' height='200' src='https://github.com/Microsoft/mixed-reality-extension-sdk/blob/master/branding/MRe-RGB.png'/>

The Mixed Reality Extension SDK Samples is the easiest way to build and run
your first [AltspaceVR](https://altvr.com/) extension using the [Mixed Reality
Extension SDK](https://github.com/Microsoft/mixed-reality-extension-sdk).

## Prerequisites

* Install [Node.js 8.12](https://nodejs.org/download/release/v8.12.0/) or
newer, which includes NPM 6.4.1 or newer, from nodejs.org

## How to Build and Run the Hello World sample

From command prompt:

1. `git clone http://github.com/microsoft/mixed-reality-extension-sdk-samples`
2. `cd mixed-reality-extension-sdk-samples\samples\hello-world`
3. `npm install` This will install all dependent packages. (and will do very
little if there are no changes)
4. `npm run build` This should not report any errors.
5. `npm start` This should print "INF: Multi-peer Adapter listening on..."

In AltspaceVR

1. Go to your personal home
2. Make sure you are signed in properly, not a guest
3. Activate the Space Editor (only available if you indicate you want to participate in the Early Access Program in your AltspaceVR settings)
4. Click Basics group
5. Click on SDKApp
6. For the URL field, enter `ws://localhost:3901`
7. Enter a session ID (This step will eventually be optional. For now, put in
any random value)
8. Click Confirm
9. If the app doesn't seem to load, click on the gear icon next the MRE object
in to the present objects list, and make sure "Is Playing" is checked.
10. After the app has been placed, you will see the MRE Anchor (the white box
with red/green/blue spikes on it), rendering on top of the MRE. You can use the
anchor to move the MRE around. To hide the anchor, uncheck "Edit Mode".

You should now see the words "Hello World" above a spinning cube.
Congratulations, you have now deployed a Node.js server with the MRE SDK onto
your local machine and connected to it from AltspaceVR.

### Hosting in the Cloud

In order for other AltspaceVR users to see your SDK app running, it must be hosted in a way they can connect to it. To learn about cloud hosting and other solutions, checkout [DEPLOYING.md](https://github.com/Microsoft/mixed-reality-extension-sdk/blob/master/DEPLOYING.md) in the SDK repo.

To learn more about the SDK, please read the [MRE SDK readme](
https://github.com/Microsoft/mixed-reality-extension-sdk/blob/master/README.md).

## Sample Descriptions

* **Hello World** - Shows text and a cube that animates when highlighted or clicked. Demonstrates basic scene creation and interaction.
* **Solar System** - Loads a 3d model for each planet and animates planetary motion. Demonstrates animation generation and more advanced scene creation.
* **Tic-Tac-Toe** - The classic game also known as "Noughts & Crosses". Demonstrates gameplay with win/lose conditions.
* **Wear A Hat** - Users can choose a hat from a menu and it will appear on their head. Demonstrates attachments.

## Contributing

This project welcomes contributions and suggestions.  Most contributions require you to agree to a
Contributor License Agreement (CLA) declaring that you have the right to, and actually do, grant us
the rights to use your contribution. For details, visit https://cla.microsoft.com.

When you submit a pull request, a CLA-bot will automatically determine whether you need to provide
a CLA and decorate the PR appropriately (e.g., label, comment). Simply follow the instructions
provided by the bot. You will only need to do this once across all repos using our CLA.

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/).
For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or
contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.
