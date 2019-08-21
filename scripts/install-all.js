var shell = require('shelljs');
var forEachSample = require('./foreach-sample');

forEachSample((sampleDir) => {
	var cmd = `pushd ${sampleDir} && npm install && popd`;
	console.log(cmd);
	shell.exec(cmd);
});
