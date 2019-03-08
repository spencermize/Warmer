import '../scss/main.scss';
import _ from 'lodash';
import 'bootstrap';
import tinygradient from 'tinygradient';
import TinyDatePicker from 'tiny-date-picker';
import grid2geojson from 'grid2geojson';
import * as topojson from 'topojson';
import L from 'leaflet';
import './L.TopoJSON.js';
import '../../node_modules/leaflet-providers/leaflet-providers.js';
import 'leaflet.vectorgrid';

var map,layer,min,max;
$(async function(){
	TinyDatePicker('input.date',{
		min: '1/1/1700'
	}).on('select',async function(_,dp){
		var d = new Date(dp.state.selectedDate);
		d = `${d.getFullYear()}/${d.getMonth() + 1}`;
		$('input.date').val(d);
		d = await $.getJSON(`/api/netcdf/time/${d}`);
		if (d >= 0){
			loadMap(d);
		} else {
			err('Sorry, date was out of range.');
		}
	});
	initMap();
	max = await $.getJSON('/api/netcdf/temperature/max');
	min = await $.getJSON('/api/netcdf/temperature/min');
});

async function initMap(){
	map = L.map('map',{
		center: [0,0],
		zoom: 2,
		attributionControl: false
	});
	L.control.scale().addTo(map);
	L.tileLayer.provider('CartoDB.Positron').addTo(map);
}
async function loadMap(date){
	loading(true);
	const gradient = tinygradient(['rgb(0,255,0','rgb(255,0,0)']);

	if (layer){
		map.removeLayer(layer);
	}

	$.getJSON(`/api/netcdf/temperature/${date}/geojson`,async function(data){
		var start = performance.now();
		var t0 = performance.now();
		var geo = grid2geojson.toGeoJSON(data.lat,data.lng,data.data,false);
		var t1 = performance.now();
		console.log(`Conversion to GeoJSON took ${t1 - t0} milliseconds.`);
		const diff = max + Math.abs(min);

		t0 = performance.now();
		geo.features = _.filter(geo.features,function(o){
			return o.properties.value;
		});
		t1 = performance.now();
		console.log(`Removal of empty grid items took ${t1 - t0} milliseconds.`);

		t0 = performance.now();
		layer = L.vectorGrid.slicer(geo,{
			rendererFactory: L.canvas.tile,
			vectorTileLayerStyles: {
				sliced: function(feature){
					const percent = (Math.abs(min) + feature.value) / diff;
					var col = gradient.rgbAt(percent).toHexString();
					return {
						fillColor: col,
						fill: true,
						stroke: true,
						color: col,
						fillOpacity: 0.5,
						weight: 0
					};
				}
			}
		});
		t1 = performance.now();
		console.log(`Vector Grid slice took ${t1 - t0} milliseconds.`);

		//t0 = performance.now();
		//layer = L.geoJSON(geo,{
		//style: function(feature){
		//const percent = (Math.abs(min) + feature.properties.value) / diff;
		//return {
		//fillColor: gradient.rgbAt(percent),
		//stroke: false,
		//fillOpacity: 0.85
		//};
		//}
		//});

		//t0 = performance.now();
		//var topo = topojson.topology({ foo: geo },0.001);
		//t1 = performance.now();
		//console.log(`Conversion to topo took ${t1 - t0} milliseconds.`);

		//t0 = performance.now();
		//topo = topojson.presimplify(topo);
		//topo = topojson.simplify(topo,0.1);
		//t1 = performance.now();
		//console.log(`Simplification of topo took ${t1 - t0} milliseconds.`);

		//t0 = performance.now();
		//layer = new L.TopoJSON(topo,{
		//style: function(feature){
		//const percent = (Math.abs(min) + feature.properties.value) / diff;
		//return {
		//fillColor: gradient.rgbAt(percent),
		//stroke: false,
		//fillpacity: 0.85
		//};
		//}
		//});
		//t1 = performance.now();
		//console.log(`Creation of map layer took ${t1 - t0} milliseconds.`);

		t0 = performance.now();
		layer.addTo(map);
		t1 = performance.now();
		console.log(`Addition of map layer took ${t1 - t0} milliseconds.`);

		var end = performance.now();
		console.log(`Total: ${end - start} milliseconds.`);
		loading(false);
	});
}

function loading(yes = true){
	$('body').toggleClass('loading',yes);
}

function err(msg){
	var al = $('.alert');
	al.find('.text').text(msg);
	al.addClass('show');
	setTimeout(function(){
		al.removeClass('show');
	},3000);
}
