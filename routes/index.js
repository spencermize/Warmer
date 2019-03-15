var fs = require('fs');
var path = require('path');
var express = require('express');
var router = express.Router();

/*GET home page. */
router.get('/',function(req,res,_next){
	fs.readdir(path.join(path.dirname(require.main.filename),'nc'),function(err,items){
		if (err){
			console.error(err);
		} else {
			res.render('index',{ title: 'Warmer',files: items });
		}
	});
});

module.exports = router;
