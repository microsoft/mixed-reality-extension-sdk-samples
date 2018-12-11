var fs = require('fs');
var shell = require('shelljs');

const helpText = "Usage: change-sdk-source.js <sdk_source_type>\n\n\tWhere <sdk_source_type> is either: npm or sdk-source\n\n" +
"\tEnsure that there is a 'sdk-path-config.json' containing { \"sdkPath\": \"<path_to_sdk_directory>\" }\n";

function printError(errorMessage) {
    console.error(`ERROR: ${errorMessage}\n`);
    console.error(helpText);
    process.exit(1);
}

function printHelp() {
    console.log(helpText);
    process.exit();
}

var args = process.argv.slice(2);
console.log();
if (args.find(arg => {return (arg === '-h' || arg === '--help')}) !== undefined) {
    printHelp();
}

if (args.length === 0) {
    printError("Must supply an argument of either npm or sdk-source.");
}

var config = JSON.parse(fs.readFileSync('./sdk-path-config.json', 'utf8'));
if (!config || !config.sdkPath) {
    printError("Must provide a valid sdk-path-config.json with a valid sdkPath.");
}

// update environment to be linked to the local source package, or to be the npm package.
if (args[0] === 'npm') {
    shell.exec(`npm unlink ${config.sdkPath} && npm install`);
} else if (args[0] === 'source') {
    shell.exec(`npm link ${config.sdkPath}`);
} else {
    printError("Invalid command.");
}

process.exit();
