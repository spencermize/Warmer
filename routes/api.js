var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/netcdf/read', function(req, res, next) {
  const CDF = require('netcdf4');
  const file = './nc/Complete_TMAX_EqualArea.nc';
  //const data = fs.readFileSync(file);

  const parsed = new CDF.File(file, 'r');
  res.json(parsed);

});

module.exports = router;
