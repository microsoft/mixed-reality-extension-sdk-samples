Shows how to control per-user visibility of Actors by using Group Masks

## Setup

* Open a command prompt to this sample's folder and run `npm install`. Keep the command prompt open if you wish to follow the command-oriented instructions that follow.
* Open the root folder of this repo in VSCode if you wish to follow the VSCode-oriented instructions.

## Build

* Command line: `npm run build`.
* VSCode: `Shift+Ctrl+B`, then select 'build samples/group-mask'.

## Run

* Command line: `npm start`.
* VSCode: Switch to the 'Run' tab (`Ctrl+Shift+D` will open it), select 'Launch group-mask project' from the dropdown at the top, and then `F5` to start it.

MRE apps are NodeJS servers. They operate akin to a web server. When you start your MRE, it won't do much until you connect to it from a client application like AltspaceVR or the MRETestBed.

## Test in [AltspaceVR](https://altvr.com)

* Download [AltspaceVR](https://altvr.com) and create an account.
* Launch the application and sign in. You'll start in your "home space".
* Open the World Editor (only available if you indicate you want to participate in the [Early Access Program](https://altvr.com/early-access-program/) in your AltspaceVR settings).
* Add a `Basics` / `SDK App` object with a Target URI of `ws://127.0.0.1:3901`.
* See the the app appear in your space.

## Test in Unity using the [MRETestBed](https://www.github.com/mixed-reality-extension-sdk-samples)

* Install [Unity](https://unity3d.com/get-unity/download), version 2019.2.12f1 or later.
* Clone the [MRE Unity repo](https://github.com/microsoft/mixed-reality-extension-unity).
* Open the 'MRETestBed' Unity project.
* Select the 'Standalone' scene. This scene is preconfigured to connect to your MRE running locally.
* Start the Unity scene, and see the app appear.
