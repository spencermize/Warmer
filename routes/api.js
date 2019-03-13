var _ = require('lodash');
var express = require('express');
var router = express.Router();
const { PerformanceObserver,performance } = require('perf_hooks');
const obs = new PerformanceObserver((items) => {
	console.log(`${items.getEntries()[0].name}: ${items.getEntries()[0].duration}`);
	performance.clearMarks();
});
obs.observe({ entryTypes: ['measure'] });
const CDF = require('netcdf4');
const file = './nc/Land_and_Ocean_Alternate_LatLong1.nc';
performance.mark('CDFA');
const parsed = new CDF.File(file,'r');
performance.mark('CDFB');
performance.measure('CDF Load','CDFA','CDFB');
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
	performance.mark('TIMESLICEA');
	const ret = parsed.root.variables.time.readSlice(0,parsed.root.variables.time.dimensions[0].length);
	performance.mark('TIMESLICEB');
	return ret;
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
		var globe = _.map(vari.readSlice(date,1,lats,1,0,lngSize),e => {
			if (e){
				return Math.round(e * 1e5) / 1e5;
			} else {
				return 0;
			}
		});
		data.push(_.toArray(globe));
	}
	return {
		data: data,
		meta: {
			date: `${year}/${month}`
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
	performance.mark('MAXA');
	var ret = _.max(whole(vari));
	performance.mark('MAXB');
	performance.measure('Max','MAXA','MAXB');
	return ret;
}

function getMin(vari){
	performance.mark('MINA');
	var ret = _.min(whole(vari));
	performance.mark('MINB');
	performance.measure('Min','MINA','MINB');
	return ret;
}

function getWholeSet(vari){
	performance.mark('VARIA');
	vari = parsed.root.variables[vari];
	performance.mark('VARIB');
	performance.measure('Whole Vari','VARIA','VARIB');

	performance.mark('SIZESA');
	const dataSize = vari.dimensions.find(({ name }) => name === 'time').length;
	const lngSize = vari.dimensions.find(({ name }) => name === 'longitude').length;
	const latSize = vari.dimensions.find(({ name }) => name === 'latitude').length;
	performance.mark('SIZESB');
	performance.measure('Whole Sizes','SIZESA','SIZESB');

	performance.mark('SLICEA');
	var slice = vari.readSlice(0,dataSize,0,latSize,0,lngSize);
	performance.mark('SLICEB');
	performance.measure('Whole Slice','SLICEA','SLICEB');

	return slice;
}
module.exports = router;
