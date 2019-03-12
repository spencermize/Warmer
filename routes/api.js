var _ = require('lodash');
var express = require('express');
var router = express.Router();

const CDF = require('netcdf4');
const file = './nc/Complete_TAVG_LatLong1.nc';
const parsed = new CDF.File(file,'r');
const max = _.memoize(getMax);
const min = _.memoize(getMin);
const whole = _.memoize(getWholeSet);
const globe = _.memoize(getGlobe);

router.get('/netcdf/variables',function(req,res,_next){
	res.json(parsed.root.variables);
});

router.get('/netcdf/time/all',function(req,res,_next){
	res.json(getAllTimes());
});
router.get('/netcdf/time/:year/:month',function(req,res,_next){
	const times = getAllTimes();
	const mo = String(((req.params.month * 2) + 1) / 24).replace(/^0+./,'');
	const str = `${req.params.year}.${mo}`;
	const tot = Number.parseFloat(str).toFixed(4);
	const index = times.findIndex(function(num){
		return Number(num).toFixed(4) == tot;
	});
	res.json(index);
});
router.get('/netcdf/time/:num',function(req,res,_next){
	res.json(parsed.root.variables.time.read(req.params.num));
});

router.get('/netcdf/:var/',function(req,res,_next){
	res.json(parsed.root.variables[req.params.var]);
});

router.get('/netcdf/:var/dimensions',function(req,res,_next){
	res.json(parsed.root.variables[req.params.var].dimensions);
});

router.get('/netcdf/:var/:date/geojson',function(req,res,_next){
	res.json(getGeoJSON(req.params.var,req.params.date));
});
router.get('/netcdf/:var/:sDate/:eDate/geojson',function(req,res,_next){
	res.json(getGeoJSON(req.params.var,req.params.sDate,req.params.eDate));
});
router.get('/netcdf/:var/max',function(req,res,_next){
	res.json(max(req.params.var));
});
router.get('/netcdf/:var/min',function(req,res,_next){
	res.json(min(req.params.var));
});
router.get('/netcdf/:var/:date/',function(req,res,_next){
	res.json(getGlobe(req.params.var,req.params.date));
});

function getAllTimes(){
	return parsed.root.variables.time.readSlice(0,parsed.root.variables.time.dimensions[0].length);
}
function getGlobe(vari,date){
	vari = parsed.root.variables[vari];
	var lngSize = _.find(vari.dimensions,{ 'name': 'longitude' }).length;
	var latSize = _.find(vari.dimensions,{ 'name': 'latitude' }).length;
	var data = [];
	var d = parsed.root.variables.time.read(date);
	var month = Math.floor(d % 1 * 12);
	var year = Math.floor(d);

	for (var lats = 0; lats < latSize - 1; lats++){
		data.push(_.map(vari.readSlice(date,1,lats,1,0,lngSize),function(e){
			if (e){
				return Number(e).toFixed(3);
			} else {
				return 0;
			}
		}));
	}
	return {
		data: data,
		meta: {
			date: `${year}/${month + 1}`
		}
	};
}

function getGeoJSON(vari,date,eDate){
	var ret = [];
	eDate = eDate || date;
	for (var i = date; i <= eDate; i++){
		const data = getGlobe(vari,i);
		const vars = parsed.root.variables;
		const lat = _.toArray(vars.latitude.readSlice(0,vars.latitude.dimensions[0].length));
		const lng = _.toArray(vars.longitude.readSlice(0,vars.longitude.dimensions[0].length));

		ret.push({
			data: { lat: lat,lng: lng,data: data.data },
			index: i,
			meta: data.meta
		});
	}
	return ret;
}

function getMax(vari){
	return _.max(whole(vari));
}

function getMin(vari){
	return _.min(whole(vari));
}

function getWholeSet(vari){
	vari = parsed.root.variables[vari];
	const dataSize = vari.dimensions.find(({ name }) => name === 'time').length;
	const lngSize = vari.dimensions.find(({ name }) => name === 'longitude').length;
	const latSize = vari.dimensions.find(({ name }) => name === 'latitude').length;
	return vari.readSlice(0,dataSize,0,latSize,0,lngSize);
}
module.exports = router;
