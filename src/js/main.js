import '../scss/main.scss';
import _ from 'lodash';
import 'bootstrap';
import tinygradient from 'tinygradient';
import TinyDatePicker from 'tiny-date-picker';
import grid2geojson from 'grid2geojson';
import L from 'leaflet';
import '../../node_modules/leaflet-providers/leaflet-providers.js';
import 'leaflet.vectorgrid';
import 'leaflet.heat';
import '../../node_modules/leaflet.glify/glify.js';
import './leafletExport.js';

var map,min,max,rotate,diff;
var layers = [];
$(async function(){
	var options = {
		min: '1/1/1750',
		max: '11/30/2018',
		format: function(date){
			return `${date.getFullYear()}/${date.getMonth() + 1}`;
		}
	};
	TinyDatePicker('input.date-first',options);
	TinyDatePicker('input.date-last',options);
	initMap();
	max = await $.getJSON('/api/netcdf/temperature/max');
	min = await $.getJSON('/api/netcdf/temperature/min');
	diff = max + Math.abs(min);
});

async function initMap(){
	map = L.map('map',{
		center: [20,0],
		zoom: 2.5,
		minZoom: 2.5,
		zoomSnap: 0.25,
		attributionControl: false
	});
	L.control.scale().addTo(map);
	L.tileLayer.provider('CartoDB.Positron').addTo(map);

	map.on('layeradd',function(){
		loading(false);
	});
}

function clearMap(){
	layers.forEach(function(layer){
		map.removeLayer(layer);
	});
	clearInterval(rotate);
}
async function loadMap(date,type,clear){
	if (layers.length > 0 && clear){
		clearMap();
	}

	await $.getJSON(`/api/netcdf/temperature/${date}/geojson`,async function(data){
		if (type === 'poly'){
			addPolyLayer(data);
		} else if (type === 'polyGL'){
			addPolyGLLayer(data);
		} else {
			addPointGLLayer(data);
		}
	});
}

$('button.download').on('click',function(_e){
	download();
});
$('.load').on('click',function(e){
	load($(e.target).data('type'));
});

async function load(type){
	var start = $('.date-first').val();
	var end = $('.date-last').val();
	var dStart = start ? await $.getJSON(`/api/netcdf/time/${start}`) : null;
	var dEnd = await $.getJSON(`/api/netcdf/time/${end}`);
	if (dEnd && !dStart){
		await loadMap(dEnd,type,true);
		$('#map .leaflet-layer:not(:first)').first().addClass('active');
	} else if (dStart && dEnd){
		for (var i = dStart; i <= dEnd; i++){
			loading(true);
			await loadMap(i,type);
		}
		rotate = setInterval(function(){
			var layers = $('#map .leaflet-layer:not(:first)');
			var curr = $('#map .leaflet-layer.active').length ? $('#map .leaflet-layer.active') : layers.first();
			if (curr.next()){
				curr.next().addClass('active');
			} else {
				layers.first().addClass('active');
			}
			curr.removeClass('active');
		},750);
	} else {
		err('Sorry, date was out of range.');
	}
}
function addPointGLLayer(data){
	var gradient = tinygradient(['rgb(0,255,0)','rgb(255,0,0)']);
	var layer = [];
	for (var lat = 0; lat < data.lat.length - 1; lat++){
		for (var lng = 0; lng < data.lng.length - 1; lng++){
			const val = data.data[lat][lng];
			if (val != null){
				var percent = (Math.abs(min) + val) / diff;
				layer.push([data.lat[lat],data.lng[lng],percent]);
			}
		}
	}
	L.glify.points({
		map: map,
		data: layer,
		color: function(_i,point){
			var col = gradient.rgbAt(point[2]).toRgb();
			col.r = col.r / 255;
			col.g = col.g / 255;
			col.b = col.b / 255;
			return col;
		},
		size: 20,
		preserveDrawingBuffer: true
	});
}
function addPolyLayer(data){
	const gradient = tinygradient(['rgb(0,255,0)','rgb(255,0,0)']);
	var geo = grid2geojson.toGeoJSON(data.lat,data.lng,data.data,false);

	geo.features = _.filter(geo.features,function(o){
		return o.properties.value;
	});

	layers.push(new L.vectorGrid.slicer(geo,{ //eslint-disable-line new-cap
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
	}));
	layers[layers.length - 1].addTo(map);
}

function addPolyGLLayer(data){
	const gradient = tinygradient(['rgb(0,255,0)','rgb(255,0,0)']);
	var geo = grid2geojson.toGeoJSON(data.lat,data.lng,data.data,false);

	geo.features = _.filter(geo.features,function(o){
		return o.properties.value;
	});

	L.glify.shapes({
		map: map,
		data: geo,
		color: function(_i,feature){
			const percent = (Math.abs(min) + feature.properties.value) / diff;
			var col = gradient.rgbAt(percent).toRgb();
			col.r = col.r / 255;
			col.g = col.g / 255;
			col.b = col.b / 255;
			return col;
		},
		opacity: 0.85,
		preserveDrawingBuffer: true
	});
}

function download(){
	var downloadOptions = {
		container: map._container,
		exclude: ['.leaflet-control-zoom','.leaflet-control-attribution'],
		format: 'image/png',
		fileName: 'Map.png'
	};
	var promise = map.downloadExport(downloadOptions);
	promise.then(function(result){
		return result;
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
