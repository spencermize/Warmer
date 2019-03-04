var glob = require('glob');
var CLIEngine = require('eslint').CLIEngine;
var assert = require('chai').assert;
var argv = require('yargs').argv;

var paths = glob.sync('./src/js/**/*.js');
paths = paths.concat('./src/js/main.js');
paths = paths.concat('./test/*.js');
paths = paths.concat('./app.js');

const engine = new CLIEngine({
	envs: ['node','mocha'],
	fix: argv.fix,
	useEslintrc: true
});

const report = engine.executeOnFiles(paths);
const results = report.results;

describe('ESLint',function(){
	results.forEach((result) => generateTest(result));
});

CLIEngine.outputFixes(report);

function generateTest(result){
	const { filePath,messages } = result;

	it(`validates ${filePath}`,function(){
		if (messages.length > 0){
			assert.fail(false,true,formatMessages(messages));
		}
	});
}

function formatMessages(messages){
	const errors = messages.map((message) => {
		return `${message.line}:${message.column} ${message.message.slice(0,-1)} - ${message.ruleId}\n`;
	});

	return `\n${errors.join('')}`;
}
