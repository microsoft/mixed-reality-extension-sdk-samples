## Building Sample Apps Against SDK Source Code

If you wish to build and debug the samples against the cloned source code for the SDK, we have provided a script to help
you to point your app to the local source code package of the SDK rather than the one published to NPM.  To do this you
will first need to clone the [Mixed Reality Extension SDK](https://github.com/Microsoft/mixed-reality-extension-sdk)
and add a sdk-path-config.json file that contains the json `{ "sdkPath": "<path_to_sdk>"}` where the `<path_to_sdk>` is
the root folder of your SDK repo clone. This json file should be added to the `./scripts` directory where the helper script is located.
See `sdk-path-config-example.json` as an example that assumes you have cloned the SDK and sample repositories with their default names into the same parent folder.

Once added you can simply run the following npm scripts within the `./scripts` directory to
switch between SDK source code and the NPM package for the sample apps.

- `npm run use-sdk-source` to use the SDK source code.
- `npm run use-sdk-npm` to use the SDK NPM package.

The script requires shelljs to be installed, so you may need to use `npm install shelljs`.
