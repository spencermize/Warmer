var _ = require('lodash');
var express = require('express');
var router = express.Router();

const CDF = require('netcdf4');
const file = './nc/Complete_TAVG_LatLong1.nc';
const parsed = new CDF.File(file, 'r');
const grid2geojson = require('grid2geojson');

router.get('/netcdf/variables', function(req, res, next) {
  res.json(parsed.root.variables);
});

router.get('/netcdf/:var/', function(req, res, next) {
  res.json(parsed.root.variables[req.params.var]);
})

router.get('/netcdf/:var/dimensions', function(req, res, next) {
  res.json(parsed.root.variables[req.params.var].dimensions);
})

router.get('/netcdf/:var/:date/geojson', function(req, res, next) {
  const data = getGlobe(req.params.var,req.params.date);
  const vars = parsed.root.variables;
  const lat = _.toArray(vars.latitude.readSlice(0,vars.latitude.dimensions[0].length));
  const lng = _.toArray(vars.longitude.readSlice(0,vars.longitude.dimensions[0].length));
  //const geojson = grid2geojson.toGeoJSON(lat, lng, data, false);

  res.json({lat:lat,lng:lng,data:data});
});

router.get('/netcdf/:var/:date/', function(req, res, next) {
  res.json(getGlobe(req.params.var,req.params.date));
});

function getGlobe(vari,date){
  var vari = parsed.root.variables[vari];  
  var lngSize = _.find(vari.dimensions, {'name' : 'longitude'}).length;
  var latSize = _.find(vari.dimensions, {'name' : 'latitude'}).length;
  var data = [];
  for(var lats = 0; lats < latSize - 1; lats++){
    data.push(vari.readSlice(date,1,lats,1,0,lngSize));
  }
  return data;
}
module.exports = router;
