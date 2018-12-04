# Mixed Reality Extension SDK Samples

The Mixed Reality Extension SDK Samples is the easiest way to build and run your first extension using the [Mixed Reality Extension SDK](https://github.com/Microsoft/mixed-reality-extension-sdk). 

## Prerequisites
* Install [Node.js 8.12](https://nodejs.org/download/release/v8.12.0/) or newer, which includes NPM 6.4.1 or newer, from nodejs.org

## How to Build and Run the Hello World sample{#BuildAndRun}
From command prompt:
* `git clone http://github.com/microsoft/mixed-reality-extension-sdk`
* `cd mixed-reality-extension-sdk\node`
* `npm install` This will install all dependent packages. (and will do very little if there are no changes)
* `npm run build` This should not report any errors.
* `cd packages/samples/hello-world`
* `node .` (include the period) This should print "INF: Multi-peer Adapter listening on..."

In AltspaceVR
* Go to your personal home
* Make sure you are signed in properly, not a guest
* Activate the Space Editor
* Click Basics group
* Click on SDKApp
* For the URL field, please enter `ws://localhost:3901`
* Click Confirm

You should now see the words "Hello World". Congratulations, you have now deployed a Node.js server with the MRE SDK onto your local machine and connected to it from AltspaceVR.

To learn more about the SDK, please read the [MRE SDK readme](https://github.com/Microsoft/mixed-reality-extension-sdk/blob/master/README.md).

## Sample Descriptions
* Hello World - shows a text that animates when highlighting or clicking on a cube
* Solar System - loads a 3d model for each planet, generates keyframe animations, and when all assets are ready, start all animations simultaneously.

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
