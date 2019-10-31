var fs = require('fs');
var path = require('path');

const scriptPath = __dirname;
const samplesPath = path.join(scriptPath, '..', 'samples');

function forEachSample(cb) {
	fs.readdirSync(samplesPath).forEach((entry) => {
		const sampleDir = path.join(samplesPath, entry);
		if (fs.statSync(sampleDir).isDirectory()) {
			cb(sampleDir);
		}
	});
}

module.exports = forEachSample;
