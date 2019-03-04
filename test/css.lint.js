var stylelint = require('stylelint');
var assert = require('chai').assert;
var argv = require('yargs').argv;

stylelint.lint({
	files: './src/scss/*.scss',
	fix: argv.fix
}).then(function(data){
	describe('StyleLint',function(){
		data.results.forEach((result) => generateTest(result));
	});
	run();
});

function generateTest(result){
	it(`validates ${result.source}`,function(){
		if (result.errored){
			assert.fail(true,false,formatMessages(result.warnings));
		}
	});
}

function formatMessages(messages){
	const errors = messages.map((message) => {
		return `${message.line}:${message.column} ${message.text} - ${message.rule}\n`;
	});

	return `\n${errors.join('')}`;
}
